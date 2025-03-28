import { inject, injectable } from 'inversify';
import { Request, Response } from 'express';
import { BaseController, DocumentExistsMiddleware, UniqueEmailMiddleware, HttpMethod, ValidateDtoMiddleware, ValidateObjectIdMiddleware, UploadFileMiddleware, PrivateRouteMiddleware, AuthorisationMiddleware } from '../../libs/rest/index.js';
import { Logger } from '../../libs/logger/index.js';
import { Component } from '../../enums/index.js';
import { ChangeFavoriteRequest, CreateUserDto, CreateUserRequest, LoginUserRequest, ParamUserId} from './index.js';
import { UserService } from './user-service.interface.js';
import { Config, RestSchema } from '../../libs/config/index.js';
import { fillDTO } from '../../helpers/index.js';
import { UserRdo } from './rdo/user.rdo.js';
import { OfferRdo, OfferService } from '../offer/index.js';
import { AuthService } from '../auth/index.js';
import { LoggedUserRdo } from './rdo/logged-user.rdo.js';

@injectable()
export class UserController extends BaseController {
  constructor(
    @inject(Component.Logger) protected readonly logger: Logger,
    @inject(Component.UserService) private readonly userService: UserService,
    @inject(Component.OfferService) private readonly offerService: OfferService,
    @inject(Component.Config) private readonly configService: Config<RestSchema>,
    @inject(Component.AuthService) private readonly authService: AuthService,
  ) {
    super(logger);
    this.logger.info('Register routes for UserController…');

    const userMiddlewares = [
      new PrivateRouteMiddleware(),
      new AuthorisationMiddleware(this.userService),
    ];

    const routes = [
      {
        path: '/register',
        method: HttpMethod.Post,
        handler: this.create,
        middlewares: [
          new UniqueEmailMiddleware(this.userService, 'User', 'email', false),
          new ValidateDtoMiddleware(CreateUserDto),
        ]
      },
      {
        path: '/login',
        method: HttpMethod.Post,
        handler: this.login,
        middlewares: [
          new UniqueEmailMiddleware(this.userService, 'User', 'email', true),
        ]
      },
      {
        path: '/login',
        method: HttpMethod.Get,
        handler: this.checkAuthenticate,
        middlewares: userMiddlewares
      },
      {
        path: '/logout',
        method: HttpMethod.Post,
        handler: this.logout,
        middlewares: userMiddlewares
      },
      {
        path: '/favorites',
        method: HttpMethod.Get,
        handler: this.indexFavorites,
        middlewares: userMiddlewares
      },
      {
        path: '/favorites/offers/:offerId',
        method: HttpMethod.Put,
        handler: this.update,
        middlewares: [
          ...userMiddlewares,
          new ValidateObjectIdMiddleware('offerId'),
          new DocumentExistsMiddleware(this.offerService, 'Offer', 'offerId'),
        ]
      },
      {
        path: '/avatar',
        method: HttpMethod.Post,
        handler: this.uploadAvatar,
        middlewares: [
          ...userMiddlewares,
          new UploadFileMiddleware(this.configService.get('UPLOAD_DIRECTORY'), 'avatar'),
        ]
      }
    ];

    this.addRoute(routes);
  }

  public async update({ params, tokenPayload }: ChangeFavoriteRequest, res: Response): Promise<void> {
    const updatedUser = await this.userService.addToOrRemoveFromFavoritesById(tokenPayload.id, params.offerId);
    const responseData = fillDTO(UserRdo, updatedUser);
    this.ok(res, responseData);
  }

  public async indexFavorites({ tokenPayload }: Request<ParamUserId>, res: Response): Promise<void> {
    const offers = await this.userService.getAllFavorites(tokenPayload.id);

    const responseData = fillDTO(OfferRdo, offers);
    this.ok(res, responseData);
  }

  public async login(
    { body }: LoginUserRequest,
    res: Response,
  ): Promise<void> {

    const user = await this.authService.verify(body);
    const token = await this.authService.authenticate(user);
    const responseData = fillDTO(LoggedUserRdo, {
      email: user.email,
      token,
    });
    this.ok(res, responseData);
  }


  public async logout(_req: LoginUserRequest, res: Response): Promise<void> {
    // TODO: Выход из авторизированного режима
    this.okNoContent(res);
  }

  public async create(
    { body }: CreateUserRequest,
    res: Response,
  ): Promise<void> {
    const result = await this.userService.create(body, this.configService.get('SALT'));
    this.created(res, fillDTO(UserRdo, result));
  }

  public async uploadAvatar(req: Request, res: Response) {
    this.created(res, {
      filepath: req.file?.path
    });
  }

  public async checkAuthenticate({ tokenPayload: { email }}: Request, res: Response) {
    const foundedUser = await this.userService.findByEmail(email);

    // TODO: нужно ли токен возвращать, сейчас просто возвращается вся информация о пользователе?
    this.ok(res, fillDTO(LoggedUserRdo, foundedUser));
  }
}

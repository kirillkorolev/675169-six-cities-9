import { IsInt, IsMongoId, IsString, Length, Max, Min } from 'class-validator';
import { CreateCommentValidationMessages } from '../index.js';
import { COMMENT_LENGTH_MAX, COMMENT_LENGTH_MIN, RATING_MAX, RATING_MIN } from '../../../constants/index.js';


export class CreateCommentDto {
  @IsString({ message: CreateCommentValidationMessages.text.invalidFormat })
  @Length(COMMENT_LENGTH_MIN, COMMENT_LENGTH_MAX, { message: CreateCommentValidationMessages.text.lengthField })
    text: string;

  @IsInt({ message: CreateCommentValidationMessages.rating.invalidFormat })
  @Min(RATING_MIN, { message: CreateCommentValidationMessages.rating.minValue })
  @Max(RATING_MAX, { message: CreateCommentValidationMessages.rating.maxValue })
    rating: number;

  @IsMongoId({ message: CreateCommentValidationMessages.offerId.invalidId })
    offerId: string;

  @IsMongoId({ message: CreateCommentValidationMessages.author.invalidId })
    author: string;
}

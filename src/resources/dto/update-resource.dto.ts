import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateResourceDto } from './create-resource.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateResourceDto extends PartialType(CreateResourceDto) {
  @ApiProperty({
    description: 'Active status',
    example: true,
    required: false,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
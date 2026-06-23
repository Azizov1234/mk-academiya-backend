import { PartialType } from '@nestjs/swagger';
import { CreateGroupAssignmentDto } from './create-group-assignment.dto';

export class UpdateGroupAssignmentDto extends PartialType(CreateGroupAssignmentDto) {}

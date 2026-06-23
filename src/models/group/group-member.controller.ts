import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRole } from 'src/core/enums';
import { GroupMemberService } from './group-member.service';

@ApiBearerAuth()
@ApiTags('group-members')
@UseGuards(AuthGuard, RolesGuard)
@Controller('group-members')
export class GroupMemberController {
  constructor(private readonly service: GroupMemberService) {}

  @ApiOperation({
    summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN} - Student guruhga qo'shish`,
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Post(':groupId/add/:studentId')
  add(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.service.addMember(groupId, studentId);
  }

  @ApiOperation({
    summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN} - Student guruhdan chiqarish`,
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Delete(':groupId/remove/:studentId')
  remove(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.service.removeMember(groupId, studentId);
  }

  @ApiOperation({
    summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER} - Guruh a'zolarini ko'rish`,
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get(':groupId')
  findAll(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.service.findMembers(groupId);
  }
}

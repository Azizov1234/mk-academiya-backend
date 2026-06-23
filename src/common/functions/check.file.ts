import { BadRequestException } from '@nestjs/common';
import { Express } from 'express';

export const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export const ALLOWED_VIDEO_FORMATS = [
  'video/mp4',
  'video/mkv',
  'video/webm',
  'video/avi',
  'video/x-matroska',
  'video/x-msvideo',
  'video/quicktime',
];

export const ALLOWED_FILE_FORMATS = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

export function validateImage(file: Express.Multer.File): void {
  if (!ALLOWED_IMAGE_FORMATS.includes(file.mimetype)) {
    throw new BadRequestException(
      `Rasm formati notogri. Ruxsat etilgan: ${ALLOWED_IMAGE_FORMATS.join(', ')}`,
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new BadRequestException('Rasm hajmi 10MB dan oshmasligi kerak');
  }
}

export function validateVideo(file: Express.Multer.File): void {
  if (!ALLOWED_VIDEO_FORMATS.includes(file.mimetype)) {
    throw new BadRequestException(
      `Video formati notogri. Ruxsat etilgan: ${ALLOWED_VIDEO_FORMATS.join(', ')}`,
    );
  }

  if (file.size > MAX_VIDEO_SIZE) {
    throw new BadRequestException('Video hajmi 100MB dan oshmasligi kerak');
  }
}

export function validateFile(file: Express.Multer.File): void {
  if (!ALLOWED_FILE_FORMATS.includes(file.mimetype)) {
    throw new BadRequestException(
      `Fayl formati notogri. Ruxsat etilgan: ${ALLOWED_FILE_FORMATS.join(', ')}`,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException('Fayl hajmi 500MB dan oshmasligi kerak');
  }
}

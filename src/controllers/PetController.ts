import express from 'express';
import { BaseController } from './BaseController';
import { PrismaClient } from '@prisma/client';
import jwtMiddleware, { JwtUserData } from '../utils/AuthHelper';
import { PetProvider, PetRegisterData } from '../providers/PetProvider';
import { PetService } from '../services/PetService';
import {
  NotRegisteredPetError,
  DuplicatedPetNameError,
} from '../errors/PetError';
import {
  JsonController,
  Get,
  Post,
  UseBefore,
  Body,
  UploadedFiles,
  Req,
} from 'routing-controllers';
import { PhotoService } from '../services/PhotoService';
export interface SignUpPetRequest {
  data: PetData[];
}

export interface PetData {
  petName: string;
  registerNumber: string;
  rfidCode: string;
  year: string;
  breed: string;
  isNeutered: string;
  gender: string;
  weight?: number;
}

export interface PetResponse {
  status: string;
  message: string;
  data: any;
}

export interface PhotoUploadRequest {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@JsonController('/pet')
export class PetController extends BaseController {
  private databaseClient: PrismaClient;
  private petService: PetService;
  private petProvider: PetProvider;
  private photoService: PhotoService;
  constructor() {
    super();
    this.databaseClient = new PrismaClient();
    this.petService = new PetService();
    this.photoService = new PhotoService();
    this.petProvider = new PetProvider();
  }

  @Get('/')
  @UseBefore(jwtMiddleware)
  public async getPetInfo(@Req() request: express.Request) {
    const userInfo: JwtUserData = request.user;
    const myPets = await this.petService.getUserPet(userInfo.id);
    console.log(64, myPets);
    const response: PetResponse = {
      status: 'success',
      message: 'Succeed in getting pet information',
      data: myPets,
    };
    return response;
  }

  @Post('/')
  @UseBefore(jwtMiddleware)
  public async createPetInfo(
    @UploadedFiles('petImage') images: PhotoUploadRequest[],
    @Body() data: PetData,
    @Req() request: express.Request
  ) {
    const petData = JSON.parse(JSON.stringify(data))['data'];
    console.log(87, images);
    const userInfo: JwtUserData = request.user;
    let info = {};

    const newPet = await this.petService.createUserPet(userInfo.id, petData);
    if (newPet === undefined) throw new DuplicatedPetNameError();
    if (images[0] !== undefined) {
      const petPhoto = await this.photoService.createPetPhoto(
        newPet.id,
        images[0]
      );
      info = { ...petPhoto };
    }
    info = { ...newPet, ...info };

    const response: PetResponse = {
      status: 'success',
      message: 'Succeed in creating pet information',
      data: info,
    };

    return response;
  }

  @Post('/check')
  public async checkPetInfo(@Body() petData: PetData) {
    const { registerNumber } = petData;
    const registerData: PetRegisterData = await this.petProvider.getRegisterPetData(
      registerNumber
    );
    if (!registerData) throw new NotRegisteredPetError();

    const response: PetResponse = {
      status: 'success',
      message: 'Succeed in checking registered pet information',
      data: registerData,
    };

    return response;
  }
}

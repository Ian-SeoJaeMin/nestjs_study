import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Genre } from './entities/genre.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GenreService {
  constructor(
    @InjectRepository(Genre) private genreRepository: Repository<Genre>,
  ) {}

  findAll() {
    return this.genreRepository.find();
  }

  findOne(id: number) {
    return this.genreRepository.findOne({ where: { id } });
  }

  async create(createGenreDto: CreateGenreDto) {
    const genre = await this.genreRepository.findOne({
      where: { name: createGenreDto.name },
    });

    if (genre) {
      throw new NotFoundException('이미 존재하는 장르입니다.');
    }

    return this.genreRepository.save(createGenreDto);
  }
  async update(id: number, updateGenreDto: UpdateGenreDto) {
    const genre = await this.genreRepository.findOne({ where: { id } });
    if (!genre) {
      throw new NotFoundException('Genre not found');
    }

    await this.genreRepository.update({ id }, updateGenreDto);

    const newGenre = await this.genreRepository.findOne({ where: { id } });
    return newGenre;
  }

  async remove(id: number) {
    const genre = await this.genreRepository.findOne({ where: { id } });
    if (!genre) {
      throw new NotFoundException('Genre not found');
    }
    await this.genreRepository.delete({ id });
    return id;
  }
}

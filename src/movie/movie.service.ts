import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie) private movieRepository: Repository<Movie>,
    @InjectRepository(MovieDetail)
    private movieDetailRepository: Repository<MovieDetail>,
    @InjectRepository(Director)
    private directorRepository: Repository<Director>,
    @InjectRepository(Genre)
    private genreRepository: Repository<Genre>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(title?: string) {
    const qb = await this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres');

    if (title) {
      qb.where('movie.title like :title', { title: `%${title}%` });
    }

    return qb.getManyAndCount();
    // if (!title) {
    //   return this.movieRepository.find({ relations: ['director', 'genres'] });
    // }

    // return this.movieRepository.find({
    //   where: { title: Like(`%${title}%`) },
    //   relations: ['director', 'genres'],
    // });
  }

  async findOne(id: number) {
    const qb = await this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.detail', 'detail')
      .leftJoinAndSelect('movie.genres', 'genres')
      .where('movie.id = :id', { id });
    return qb.getOne();
    // const movie = await this.movieRepository.findOne({
    //   where: { id },
    //   relations: ['detail', 'director', 'genres'],
    // });
    // if (!movie) throw new NotFoundException('Movie not found');
    // return movie;
  }

  async create(movieData: CreateMovieDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const { detail, directorId, genreIds, ...movieRest } = movieData;
      const director = await qr.manager.findOne(Director, {
        where: { id: directorId },
      });
      if (!director) throw new NotFoundException('Director not found');

      const genres = await qr.manager.find(Genre, {
        where: { id: In(genreIds) },
      });

      if (genres.length !== genreIds.length)
        throw new NotFoundException(
          `Genres not found (exist ids => ${genres.map((genre) => genre.id).join(', ')})`,
        );

      const movieDetail = await qr.manager
        .createQueryBuilder()
        .insert()
        .into(MovieDetail)
        .values({ detail })
        .execute();

      const movieDetailId = movieDetail.identifiers[0].id;

      const movie = await qr.manager
        .createQueryBuilder()
        .insert()
        .into(Movie)
        .values({
          ...movieRest,
          detail: { id: movieDetailId },
          director,
          //genres // many-to-many 관계로 인해 이렇게 넣을 수 없음
        })
        .execute();

      const movieId = movie.identifiers[0].id;

      await qr.manager
        .createQueryBuilder()
        .relation(Movie, 'genres')
        .of(movieId)
        .add(genres.map((genre) => genre.id));

      await qr.commitTransaction();

      return this.movieRepository.findOne({
        where: { id: movieId },
        relations: ['detail', 'director', 'genres'],
      });

      // Create 할때는 movieRepository 를 이용하는게 queryBuilder 보다 편리함

      // return await this.movieRepository.save({
      //   ...movieRest,
      //   detail: { detail },
      //   director,
      //   genres,
      // });
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release(); // 트랜젝션 돌려주기
    }
  }

  async update(id: number, movieData: UpdateMovieDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const movie = await qr.manager.findOne(Movie, {
        where: { id },
        relations: ['detail', 'genres'],
      });

      if (!movie) throw new NotFoundException('Movie not found');

      const { detail, directorId, genreIds, ...movieRest } = movieData;
      let newDirector, newGenres;

      if (directorId) {
        const director = await qr.manager.findOne(Director, {
          where: { id: directorId },
        });
        if (!director) throw new NotFoundException('Director not found');
        newDirector = director;
      }

      if (genreIds) {
        const genres = await qr.manager.find(Genre, {
          where: { id: In(genreIds) },
        });

        if (genres.length !== genreIds.length)
          throw new NotFoundException(
            `Genres not found (exist ids => ${genres.map((genre) => genre.id).join(', ')})`,
          );

        newGenres = genres;
      }

      await qr.manager
        .createQueryBuilder()
        .update(Movie)
        .set({
          ...movieRest,
          ...(newDirector && { director: newDirector }),
          // ...(newGenres && { genres: newGenres }), // TypeORM 에선 이렇게 업데이트 불가
        })
        .where('id = :id', { id })
        .execute();

      // await this.movieRepository.update(
      //   { id },
      //   {
      //     ...movieRest,
      //     ...(newDirector && { director: newDirector }),
      //     // ...(newGenres && { genres: newGenres }), // TypeORM 에선 이렇게 업데이트 불가
      //   },
      // );

      if (detail) {
        await qr.manager
          .createQueryBuilder()
          .update(MovieDetail)
          .set({ detail })
          .where('id = :id', { id: movie.detail.id })
          .execute();
        // await this.movieDetailRepository.update(
        //   { id: movie.detail.id },
        //   { detail },
        // );
      }

      if (newGenres) {
        await qr.manager
          .createQueryBuilder()
          .relation(Movie, 'genres')
          .of(id)
          .addAndRemove(
            newGenres.map((genre) => genre.id),
            movie.genres.map((genre) => genre.id),
          );
      }

      // const newMovie = await this.movieRepository.findOne({
      //   where: { id },
      //   relations: ['detail', 'director', 'genres'],
      // });

      // newMovie.genres = newGenres;
      // await this.movieRepository.save(newMovie);

      // return this.movieRepository.preload(newMovie); // newMovie에 있는 값들로 데이터를 채워서 반환

      await qr.commitTransaction();
      return this.movieRepository.findOne({
        where: { id },
        relations: ['detail', 'director', 'genres'],
      });
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  async remove(id: number) {
    const movie = await this.movieRepository.findOne({
      where: { id },
      relations: ['detail'],
    });

    if (!movie) throw new NotFoundException('Movie not found');

    await this.movieRepository
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id })
      .execute();

    // await this.movieRepository.delete({ id });
    await this.movieDetailRepository.delete({ id: movie.detail.id });
  }
}

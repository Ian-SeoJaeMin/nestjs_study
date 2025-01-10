import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseTable } from '../../common/entity/base-table.entity';
import { MovieDetail } from './movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { Transform } from 'class-transformer';
import { User } from 'src/user/entities/user.entity';
import { MovieUserLike } from './movie-user-like.entity';

/// ManyToOne Director -> Movies
/// OneToOne MovieDetail -> Movie
/// ManyToMany Genre -> Movies / Movies -> Genre

@Entity()
export class Movie extends BaseTable {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.createMovies)
    creator: User;

    @Column({
        unique: true
    })
    title: string;

    @OneToOne(() => MovieDetail, movieDetail => movieDetail.movie, {
        cascade: true,
        nullable: false
    })
    @JoinColumn()
    detail: MovieDetail;

    @ManyToOne(() => Director, director => director.id, {
        cascade: true,
        nullable: false
    })
    director: Director;

    @ManyToMany(() => Genre, genre => genre.movies)
    @JoinTable()
    genres: Genre[];

    @Column({
        default: 0
    })
    likeCount: number;

    @Column({
        default: 0
    })
    dislikeCount: number;

    @Column()
    @Transform(({ value }) => `http://localhost:3000/${value}`) // 데이터를 읽어올때 변환
    movieFilePath: string;

    @OneToMany(() => MovieUserLike, mul => mul.movie)
    likedUsers: MovieUserLike;
}

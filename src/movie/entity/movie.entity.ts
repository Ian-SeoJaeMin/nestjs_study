import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseTable } from '../../common/entity/base-table.entity';
import { MovieDetail } from './movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';

/// ManyToOne Director -> Movies
/// OneToOne MovieDetail -> Movie
/// ManyToMany Genre -> Movies / Movies -> Genre

@Entity()
export class Movie extends BaseTable {
    @PrimaryGeneratedColumn()
    id: number;

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
}

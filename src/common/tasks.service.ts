import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { readdir, unlink } from 'fs/promises';
import { join, parse } from 'path';

@Injectable()
export class TasksService {
    constructor() {}

    // @Cron('*/5 * * * * *')
    logEverSecond() {
        console.log('1초 마다 실행');
    }

    // @Cron('* * * * * *')
    async eraseOrphanFiles() {
        const tempPath = join(process.cwd(), 'public', 'temp');
        const files = await readdir(tempPath);

        const deleteFileTargets = files.filter(file => {
            const fileName = parse(file).name;
            const splits = fileName.split('_');

            if (splits.length !== 2) {
                return true;
            }

            try {
                const date = +new Date(parseInt(splits[splits.length - 1]));
                const aDayInMiliseconds = 24 * 60 * 60 * 1000;

                const now = +new Date();

                return now - date > aDayInMiliseconds; // 파일이 업로드된지 하루 이상 지났는지 체크
            } catch (e) {
                return true;
            }
        });

        // 삭제할 파일이 많아지면 비효율적
        /*
        for (let i = 0; i < deleteFileTargets.length; i++) {
            await unlink(join(process.cwd(), 'public', 'temp', deleteFileTargets[i]));
        }
        */

        // promise.all 내부 함수를 모두 병렬로 수행. 완료되면 응답
        await Promise.all(deleteFileTargets.map(x => unlink(join(process.cwd(), 'public', 'temp', x))));
    }
}

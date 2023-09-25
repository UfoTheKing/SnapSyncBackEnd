import { HttpException } from '@/exceptions/HttpException';
import { TimelineNode } from '@/interfaces/project/feed.interface';
import { SnapsSync } from '@/models/snaps_sync.model';
import { Users } from '@/models/users.model';

class FeedService {
  public async findTimeline(userId: number): Promise<{
    nodes: TimelineNode[];
  }> {
    const findUser = await Users.query().whereNotDeleted().findById(userId);
    if (!findUser) throw new HttpException(404, "User doesn't exist");

    const snapsSync = await SnapsSync.query().whereNotDeleted();

    const nodes: TimelineNode[] = [];

    // await Promise.all(
    //   snapsSync.map(async snapSync => {
    //     try {
    //       let feed = await this.findFeedById(snapSync.id, userId);
    //       nodes.push({
    //         feed: feed,
    //       });
    //     } catch (error) {
    //       // Non faccio nulla semplicemente non aggiungo il feed
    //       console.log(error);
    //     }
    //   }),
    // );

    return {
      nodes: nodes,
    };
  }
}

export default FeedService;

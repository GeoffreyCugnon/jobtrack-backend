import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma/generated/prisma/client';
import { buildETag } from '../utils/etag';

/** Champs d'utilisateur exposés dans une relation (jamais de hash / jetons). */
const CONNECTION_USER_SELECT = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  avatar_url: true,
} as const satisfies Prisma.UserSelect;

type ConnectionRow = Prisma.ConnectionGetPayload<{
  include: {
    user_connection_user_action_idTouser: {
      select: typeof CONNECTION_USER_SELECT;
    };
    user_connection_user_receiver_idTouser: {
      select: typeof CONNECTION_USER_SELECT;
    };
  };
}>;

const INCLUDE_USERS = {
  user_connection_user_action_idTouser: { select: CONNECTION_USER_SELECT },
  user_connection_user_receiver_idTouser: { select: CONNECTION_USER_SELECT },
} as const;

@Injectable()
export class ConnectionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Toute ligne reliant `a` et `b`, quel que soit le sens. */
  private pairWhere(a: number, b: number): Prisma.ConnectionWhereInput {
    return {
      OR: [
        { user_action_id: a, user_receiver_id: b },
        { user_action_id: b, user_receiver_id: a },
      ],
    };
  }

  /** Envoie une invitation de `meId` vers `targetId`. */
  async request(meId: number, targetId: number) {
    if (meId === targetId) {
      throw new BadRequestException('Impossible de se connecter à soi-même.');
    }

    const existing = await this.prisma.connection.findFirst({
      where: this.pairWhere(meId, targetId),
    });
    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new BadRequestException('Vous êtes déjà en relation.');
      }
      throw new BadRequestException('Une invitation est déjà en cours.');
    }

    await this.prisma.connection.create({
      data: {
        user_action_id: meId,
        user_receiver_id: targetId,
        status: 'PENDING',
      },
    });
    return { status: 'pending_out' as const };
  }

  /** Signal léger pour l'ETag de `GET /connection` — même `where` que `list()`. */
  async getListETag(meId: number): Promise<string> {
    const agg = await this.prisma.connection.aggregate({
      where: {
        OR: [{ user_action_id: meId }, { user_receiver_id: meId }],
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      _max: { updated_at: true },
      _count: { _all: true },
    });
    return buildETag(meId, agg._count._all, agg._max.updated_at);
  }

  /** Le réseau de `meId` : relations acceptées, invitations reçues et envoyées. */
  async list(meId: number) {
    const rows = await this.prisma.connection.findMany({
      where: {
        OR: [{ user_action_id: meId }, { user_receiver_id: meId }],
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      include: INCLUDE_USERS,
      orderBy: { created_at: 'desc' },
    });

    const connections: {
      user: ConnectionRow['user_connection_user_action_idTouser'];
      since: Date;
    }[] = [];
    const incoming: typeof connections = [];
    const outgoing: typeof connections = [];

    for (const row of rows) {
      const iAmAction = row.user_action_id === meId;
      const other = iAmAction
        ? row.user_connection_user_receiver_idTouser
        : row.user_connection_user_action_idTouser;

      if (row.status === 'ACCEPTED') {
        connections.push({ user: other, since: row.updated_at });
      } else if (iAmAction) {
        outgoing.push({ user: other, since: row.created_at });
      } else {
        incoming.push({ user: other, since: row.created_at });
      }
    }

    return { connections, incoming, outgoing };
  }

  /** `meId` accepte l'invitation reçue de `otherId`. */
  async accept(meId: number, otherId: number) {
    const res = await this.prisma.connection.updateMany({
      where: {
        user_action_id: otherId,
        user_receiver_id: meId,
        status: 'PENDING',
      },
      data: { status: 'ACCEPTED' },
    });
    if (res.count === 0) {
      throw new NotFoundException('Aucune invitation à accepter.');
    }
    return { status: 'connected' as const };
  }

  /**
   * Supprime le lien entre `meId` et `otherId`, quel que soit son état :
   * refuser une invitation reçue, annuler une invitation envoyée, ou retirer
   * une relation acceptée.
   */
  async remove(meId: number, otherId: number) {
    const res = await this.prisma.connection.deleteMany({
      where: this.pairWhere(meId, otherId),
    });
    if (res.count === 0) {
      throw new NotFoundException('Aucune relation à supprimer.');
    }
    return { status: 'none' as const };
  }
}

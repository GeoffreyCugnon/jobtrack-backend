import { Publication_type } from '../../../prisma/generated/prisma/enums';

export class Publication {
  id: number;

  title: string;

  content: string;

  type: Publication_type;

  is_public: boolean;

  likes_count: number;
}

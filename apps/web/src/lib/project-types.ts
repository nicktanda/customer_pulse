/** Shared shape for project membership rows (safe for client + server). */
export type UserProjectRow = {
  projectId: number;
  name: string;
  slug: string;
  isOwner: boolean;
};

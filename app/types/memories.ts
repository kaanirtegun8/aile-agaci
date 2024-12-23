export interface Memory {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  relationId: string;
}

export interface MemoryStore {
  [key: string]: Memory;
}

const memories: MemoryStore = {};
export default memories; 
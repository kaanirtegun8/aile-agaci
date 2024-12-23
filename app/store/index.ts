import { create } from 'zustand';
import { Memory, MemoryStore } from '../types/memories';

interface Store {
  memories: MemoryStore;
  addMemory: (memory: Memory) => void;
  deleteMemory: (id: string) => void;
  getMemory: (id: string) => Memory | undefined;
}

export const useStore = create<Store>((set: any, get: any) => ({
  memories: {},

  addMemory: (memory: Memory) => {
    set((state: Store) => ({
      memories: {
        ...state.memories,
        [memory.id]: memory,
      },
    }));
  },

  deleteMemory: (id: string) => {
    set((state: Store) => {
      const newMemories = { ...state.memories };
      delete newMemories[id];
      return { memories: newMemories };
    });
  },

  getMemory: (id: string) => {
    return get().memories[id];
  },
}));

export default function Store() {
  return null;
} 
import { useCallback } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '../components/ui/Icons';
import { useToast } from '../context/ToastContext';

export interface UseRowReorderOptions<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>> | ((items: T[]) => void);
  onUpdateOrder: (item: T, newOrderRank: number) => Promise<any>;
  idKey?: keyof T;
  orderKey?: keyof T;
  successMessage?: string;
  errorMessage?: string;
}

export function useRowReorder<T extends Record<string, any>>({
  items,
  setItems,
  onUpdateOrder,
  idKey = 'id' as keyof T,
  orderKey = 'order_rank' as keyof T,
  successMessage = 'Order updated successfully.',
  errorMessage = 'Failed to update order.',
}: UseRowReorderOptions<T>) {
  const { showToast } = useToast();

  const resolveIndex = useCallback(
    (target: T | number): number => {
      if (typeof target === 'number') return target;
      return items.findIndex((i) => i[idKey] === target[idKey]);
    },
    [items, idKey]
  );

  const swapRows = useCallback(
    async (currentIndex: number, targetIndex: number) => {
      if (currentIndex < 0 || currentIndex >= items.length) return;
      if (targetIndex < 0 || targetIndex >= items.length) return;

      const previousItems = [...items];
      const newItems = [...items];
      
      const currentItem = newItems[currentIndex];
      const targetItem = newItems[targetIndex];

      // Optimistically swap positions in local array
      newItems[currentIndex] = targetItem;
      newItems[targetIndex] = currentItem;

      // Assign sequential order_rank values based on new indices
      const currentOrder = targetIndex + 1;
      const targetOrder = currentIndex + 1;

      newItems[targetIndex] = { ...currentItem, [orderKey]: currentOrder };
      newItems[currentIndex] = { ...targetItem, [orderKey]: targetOrder };

      if (typeof setItems === 'function') {
        setItems(newItems);
      }

      try {
        await Promise.all([
          onUpdateOrder(currentItem, currentOrder),
          onUpdateOrder(targetItem, targetOrder),
        ]);
        if (successMessage) {
          showToast(successMessage, 'success');
        }
      } catch (err: any) {
        // Rollback state on failure
        if (typeof setItems === 'function') {
          setItems(previousItems);
        }
        showToast(err?.message || errorMessage, 'error');
      }
    },
    [items, setItems, onUpdateOrder, orderKey, successMessage, errorMessage, showToast]
  );

  const moveUp = useCallback(
    (target: T | number) => {
      const idx = resolveIndex(target);
      if (idx > 0) {
        swapRows(idx, idx - 1);
      }
    },
    [resolveIndex, swapRows]
  );

  const moveDown = useCallback(
    (target: T | number) => {
      const idx = resolveIndex(target);
      if (idx >= 0 && idx < items.length - 1) {
        swapRows(idx, idx + 1);
      }
    },
    [resolveIndex, swapRows, items.length]
  );

  const getReorderActionItems = useCallback(
    (target: T | number, totalCount?: number) => {
      const idx = resolveIndex(target);
      const total = totalCount ?? items.length;

      return [
        {
          label: 'Move Up',
          icon: ArrowUpIcon,
          disabled: idx <= 0,
          onClick: () => moveUp(idx),
        },
        {
          label: 'Move Down',
          icon: ArrowDownIcon,
          disabled: idx < 0 || idx >= total - 1,
          onClick: () => moveDown(idx),
        },
      ];
    },
    [resolveIndex, items.length, moveUp, moveDown]
  );

  return {
    moveUp,
    moveDown,
    getReorderActionItems,
    swapRows,
  };
}

export default useRowReorder;

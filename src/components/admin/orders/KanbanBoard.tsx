'use client';

import { useMemo } from 'react';
import { useAdminStore, Order } from '@/lib/store/useAdminStore';
import { supabase } from '@/lib/supabase';
import { DndContext, DragEndEvent, closestCenter, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Phone, Clock, MessageSquare } from 'lucide-react';

const COLUMNS = [
  { id: 'PENDING_AGENT_CONFIRMATION', title: 'Pending' },
  { id: 'CONFIRMED', title: 'Confirmed' },
  { id: 'SHIPPED', title: 'Shipped' },
  { id: 'DELIVERED', title: 'Delivered' },
  { id: 'CANCELED', title: 'Canceled / RTO' },
];

function DraggableOrderCard({ order, onClick }: { order: Order; onClick: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  const { callLogs } = useAdminStore();
  const calls = callLogs.filter(c => c.orderId === order.id);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={() => onClick(order.id)}
      className={`bg-white p-3 rounded-xl border ${isDragging ? 'border-indigo-500 shadow-xl' : 'border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md'} transition-shadow cursor-grab active:cursor-grabbing mb-3`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="font-mono text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{order.id.slice(0, 8)}</div>
        <div className="text-[9px] text-slate-400 font-bold">{new Date(order.date).toLocaleDateString()}</div>
      </div>
      <div className="font-bold text-sm text-slate-900 leading-tight">{order.customer}</div>
      <div className="text-xs text-slate-500 mb-2 truncate">{order.wilaya || order.province || 'No Wilaya'}</div>
      
      <div className="flex items-center justify-between mt-3">
        <div className="font-black text-indigo-600 text-xs">{order.total}</div>
        <div className="flex gap-1">
          {calls.length > 0 && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-black flex items-center gap-1"><Phone size={8}/> {calls.length}</span>}
          {order.notes && order.notes.length > 0 && <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[9px] font-black"><MessageSquare size={8}/></span>}
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ id, title, orders, onOrderClick }: { id: string, title: string, orders: Order[], onOrderClick: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={`flex flex-col w-[300px] shrink-0 bg-slate-50/80 rounded-2xl p-4 border ${isOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-transparent'}`}
    >
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="font-black text-slate-700 text-sm">{title}</h3>
        <span className="bg-white text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">{orders.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {orders.map(order => (
          <DraggableOrderCard key={order.id} order={order} onClick={onOrderClick} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard({ 
  orders, 
  onOrderClick,
  sessionUser
}: { 
  orders: Order[]; 
  onOrderClick: (id: string) => void;
  sessionUser: string;
}) {
  const { activeStore, setOrders, addActivityLog } = useAdminStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px drag distance to activate, allows clicking
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as string;
    const order = orders.find(o => o.id === orderId);

    if (order && order.status !== newStatus) {
      // Optimistic UI update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      
      try {
        await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        addActivityLog({ 
          storeId: activeStore.id, 
          user: sessionUser || 'Admin', 
          action: 'Order Moved', 
          detail: `Moved ${orderId.slice(0, 8)} to ${newStatus}` 
        });
      } catch (err) {
        console.error('Failed to move order:', err);
        // Revert on failure
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: order.status } : o));
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-8 min-h-[70vh] items-start px-2">
        {COLUMNS.map(col => (
          <DroppableColumn 
            key={col.id} 
            id={col.id} 
            title={col.title} 
            orders={orders.filter(o => o.status === col.id || (col.id === 'CANCELED' && o.status === 'RTO'))}
            onOrderClick={onOrderClick}
          />
        ))}
      </div>
    </DndContext>
  );
}

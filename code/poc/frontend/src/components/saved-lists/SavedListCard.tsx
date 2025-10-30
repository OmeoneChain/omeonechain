'use client';

import { useState } from 'react';
import { MoreVertical, Edit2, Trash2, Eye, Share2, Globe, Lock, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import savedListsService, { SavedList } from '@/lib/services/saved-lists-service';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SavedListCardProps {
  list: SavedList;
  onDeleted: (listId: string) => void;
  onUpdated: (list: SavedList) => void;
}

export default function SavedListCard({ list, onDeleted, onUpdated }: SavedListCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleView = () => {
    router.push(`/saved-lists/${list.id}`);
  };

  const handleEdit = () => {
    // TODO: Implement edit modal
    console.log('Edit list:', list.id);
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${list.name}"? This will remove all items from this list.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await savedListsService.deleteList(list.id);
      onDeleted(list.id);
      showToast('List deleted successfully');
    } catch (error) {
      console.error('Error deleting list:', error);
      showToast(error instanceof Error ? error.message : 'Failed to delete list', 'error');
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  const handlePublish = () => {
    // TODO: Implement publish as guide functionality
    showToast('Publish feature coming soon!');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getListTypeLabel = (type: string) => {
    switch (type) {
      case 'places': return 'Places to Try';
      case 'bookmarks': return 'Bookmarks';
      case 'mixed': return 'Mixed';
      default: return type;
    }
  };

  const getListTypeColor = (type: string) => {
    switch (type) {
      case 'places': return 'from-blue-500 to-cyan-500';
      case 'bookmarks': return 'from-green-500 to-emerald-500';
      case 'mixed': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  // Get first few restaurant items for preview (mock data - replace with actual items)
  const displayedRestaurants = (list as any).items?.slice(0, 3) || [];
  const remainingCount = Math.max(0, (list.itemCount || 0) - 3);

  return (
    <motion.div
      className={cn(
        "bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:shadow-lg hover:border-gray-300"
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleView}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient Header - matches ListCard style */}
      <div className={cn(
        "relative bg-gradient-to-r px-4 py-3",
        getListTypeColor(list.listType)
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="text-2xl">{list.icon || '📚'}</span>
            <span className="font-medium text-sm">{getListTypeLabel(list.listType)}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Privacy Badge */}
            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center gap-1">
              {list.isPublic ? (
                <>
                  <Globe size={10} />
                  Public
                </>
              ) : (
                <>
                  <Lock size={10} />
                  Private
                </>
              )}
            </span>
            {/* Menu Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Menu Dropdown */}
        {showMenu && (
          <div 
            className="absolute right-4 top-14 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={handleView} className="menu-item">
              <Eye className="w-4 h-4" />
              <span>View List</span>
            </button>
            <button onClick={handleEdit} className="menu-item">
              <Edit2 className="w-4 h-4" />
              <span>Edit Details</span>
            </button>
            {!list.isPublic && (
              <button onClick={handlePublish} className="menu-item">
                <Share2 className="w-4 h-4" />
                <span>Publish as Guide</span>
              </button>
            )}
            <div className="border-t border-gray-100 my-1" />
            <button 
              onClick={handleDelete} 
              className="menu-item danger"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete List'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title and Description */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">
            {list.name}
          </h3>
          {list.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {list.description}
            </p>
          )}
        </div>

        {/* Restaurant Previews - Similar to ListCard carousel */}
        {displayedRestaurants.length > 0 && (
          <div className="py-1">
            <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {displayedRestaurants.map((item: any, index: number) => (
                <div key={index} className="flex-shrink-0 w-24 group">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 mb-1 border border-gray-200 group-hover:border-purple-300 transition-colors">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🍽️
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">
                    {item.name || 'Restaurant'}
                  </div>
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="flex-shrink-0 w-24">
                  <div className="w-24 h-24 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center mb-1">
                    <div className="text-center">
                      <div className="text-xl font-semibold text-gray-400">+{remainingCount}</div>
                      <div className="text-xs text-gray-500">more</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {displayedRestaurants.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-sm text-gray-500">
              No items yet. Start adding restaurants!
            </p>
          </div>
        )}

        {/* Stats and Metadata */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-medium">
              {list.itemCount || 0} {list.itemCount === 1 ? 'item' : 'items'}
            </span>
            <span>•</span>
            <span>
              Updated {formatDate(list.updatedAt)}
            </span>
          </div>
        </div>

        {/* Action Button - View Full List */}
        <button
          onClick={handleView}
          className={cn(
            "w-full px-4 py-2 bg-gradient-to-r text-white rounded-lg transition-all text-sm font-medium",
            getListTypeColor(list.listType),
            "hover:shadow-md"
          )}
        >
          View Full List
        </button>
      </div>

      <style jsx>{`
        .menu-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 0.875rem;
          color: #374151;
        }

        .menu-item:hover {
          background: #f9fafb;
        }

        .menu-item.danger {
          color: #dc2626;
        }

        .menu-item.danger:hover {
          background: #fef2f2;
        }

        .menu-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :global(.toast) {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          padding: 1rem 1.5rem;
          border-radius: 0.5rem;
          background: #10b981;
          color: white;
          font-weight: 500;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 2000;
          animation: slideIn 0.3s ease-out;
        }

        :global(.toast-error) {
          background: #ef4444;
        }

        @keyframes slideIn {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Scrollbar Styles */
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }

        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 3px;
        }

        .scrollbar-track-gray-100::-webkit-scrollbar-track {
          background-color: #f3f4f6;
          border-radius: 3px;
        }
      `}</style>
    </motion.div>
  );
}
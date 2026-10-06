import React from 'react';
import { Bookmark } from '../../../../packages/shared/types';
import { BookmarkCard } from './BookmarkCard';

interface PinnedBookmarkCardProps {
  bookmark: Bookmark;
}

export const PinnedBookmarkCard: React.FC<PinnedBookmarkCardProps> = ({ bookmark }) => {
  return <BookmarkCard bookmark={bookmark} />;
};

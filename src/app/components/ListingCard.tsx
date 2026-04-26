import React, { useState, useEffect } from 'react';
import { API } from '../../utils/api';
import type { Listing, User } from '../../types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { TomatoRatingDisplay } from './TomatoRating';
import { isProduceInSeason } from '../../utils/seasonalProduce';

interface ListingCardProps {
  listing: Listing;
  onClick: () => void;
  mobileActive?: boolean;
  rank?: number | null;
}

export function ListingCard({ listing, onClick, mobileActive = false, rank = null }: ListingCardProps) {
  const [seller, setSeller] = useState<User | null>(null);
  const inSeason: boolean = isProduceInSeason(listing.title, listing.description);

  useEffect(() => {
    const loadSeller = async () => {
      try {
        const data = await API.getProfile(listing.sellerId);
        setSeller(data.profile);
      } catch (err) {
        console.error('Failed to load seller', err);
      }
    };
    loadSeller();
  }, [listing.sellerId]);

  return (
    <Card
      onClick={onClick}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          (e.currentTarget as HTMLElement).focus();
        }
      }}
      role="button"
      tabIndex={0}
      data-mobile-card-id={listing.id}
      aria-label={`View listing: ${listing.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={[
        'w-full max-w-[398px] mx-auto cursor-pointer transition-all duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        inSeason ? 'in-season-card' : 'hover:shadow-2xl hover:-translate-y-0.5 hover:scale-[1.01] mobile-focus-shadow-2xl',
        mobileActive ? 'mobile-scroll-active-2xl' : '',
      ].join(' ')}
    >
      <div className="relative w-full aspect-square max-w-[398px] max-h-[398px] bg-muted overflow-hidden mx-auto">
        {inSeason ? (
          <span className="absolute top-2 left-2 z-0 flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full shadow">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 3.293a1 1 0 011.414 1.414l-10 10a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l9.293-9.293z" />
            </svg>
            In Season
          </span>
        ) : null}
        {rank ? (
          <span className="absolute top-2 right-2 z-[1] flex items-center gap-1 bg-background/95 text-primary text-xs font-semibold px-2.5 py-1 rounded-full border border-primary/20 shadow-sm backdrop-blur-sm">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
            </svg>
            #{rank}
          </span>
        ) : null}
        {listing.photos?.[0] ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className={`w-full h-full object-cover${listing.status === 'completed' ? ' opacity-60' : ''}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 6 12 6C7.58172 6 4 9.58172 4 14C4 18.4183 7.58172 22 12 22Z" />
            </svg>
          </div>
        )}
        {listing.status === 'completed' && (
          <span className="absolute bottom-2 left-2 z-[1] flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l3.5 3.5L17 8" />
            </svg>
            Exchanged
          </span>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-1">{listing.title}</h3>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {listing.zipCode}
          </Badge>
        </div>
        {rank ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
            </svg>
            Community Rank #{rank}
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
        {listing.quantity ? (
          <p className="text-sm font-medium text-foreground">Qty: {listing.quantity}</p>
        ) : null}
        {seller ? (
          <div className="pt-1">
            {seller.ratingCount > 0 ? (
              <TomatoRatingDisplay rating={seller.rating} count={seller.ratingCount} />
            ) : (
              <span className="text-xs text-muted-foreground">New seller</span>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

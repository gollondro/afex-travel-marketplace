'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Clock, Building2 } from 'lucide-react';
import { Program } from '@/lib/api';
import { formatCLP } from '@/lib/utils';
import { Card } from './ui';

interface ProgramCardProps {
  program: Program;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const imageUrl = program.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800';

  return (
    <Link href={`/programs/${program.id}`}>
      <Card hoverable className="overflow-hidden h-full flex flex-col">
        {/* Image */}
        <div className="relative h-48 bg-gray-200">
          <Image
            src={imageUrl}
            alt={program.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="font-bold text-green-600">{formatCLP(program.price_clp)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
            {program.name}
          </h3>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-1">
            {program.description}
          </p>

          <div className="space-y-2 mt-auto">
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="w-4 h-4 mr-1.5 text-green-500 flex-shrink-0" />
              <span className="truncate">{program.destination}</span>
            </div>

            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1.5 text-green-500 flex-shrink-0" />
              <span>{program.duration}</span>
            </div>

            {program.agency_name && (
              <div className="flex items-center text-sm text-gray-500">
                <Building2 className="w-4 h-4 mr-1.5 text-green-500 flex-shrink-0" />
                <span className="truncate">{program.agency_name}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

// Skeleton for loading state
export function ProgramCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-48 bg-gray-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="space-y-2 pt-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </div>
    </Card>
  );
}

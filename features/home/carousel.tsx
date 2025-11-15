'use client';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const carouselItems = [
  { label: 'Carousel 1', images: '' },
  { label: 'Carousel 2', images: '' },
  { label: 'Carousel 3', images: '' },
  { label: 'Carousel 4', images: '' },
];

export default function HomeCarousel() {
  return (
    <Carousel className="rounded-lg!">
      <CarouselContent className="rounded-lg!">
        {carouselItems.map((item, idx) => (
          <CarouselItem key={idx} className="w-full min-h-96 bg-muted">
            <div className="flex items-center justify-center w-full h-full font-semibold text-muted-foreground select-none">
              {item.label}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="absolute top-1/2 left-2 flex items-center justify-center">
        <CarouselPrevious className="relative left-0 translate-x-0 hover:translate-x-0 hover:bg-primary/90" />
      </div>
      <div className="absolute top-1/2 right-2 flex items-center justify-center">
        <CarouselNext className="relative right-0 translate-x-0 hover:translate-x-0 hover:bg-primary/90" />
      </div>
    </Carousel>
  );
}

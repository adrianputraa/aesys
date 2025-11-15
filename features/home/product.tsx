'use client';

import { kebabCase } from 'lodash-es';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface Props {
  name: string;
  data: any[];
}

export default function Products({ ...props }: Props) {
  return (
    <div id={kebabCase(props.name)} className="space-y-2">
      <h6 className="font-semibold text-lg">{props.name}</h6>
      <Carousel opts={{ align: 'start' }} className="w-full">
        <CarouselContent className="space-x-0! gap-0!">
          {props.data.map((_, index) => (
            <CarouselItem key={index} className="aspect-9/12 basis-64 first:ml-4 last:mr-4 select-none ">
              <div className="p-1 w-full h-full">
                <Card className="w-full h-full shadow-none">
                  <CardContent className=" items-center justify-center p-6">
                    <span className="text-3xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

interface VideoItemProps {
  title: string;
  description: string;
}

function VideoItem({ title, description }: VideoItemProps) {
  return (
    <div className="aspect-9/16 flex flex-col gap-2 border rounded-lg h-96 p-2 select-none">
      <p className="mt-auto text-center">{title}</p>
    </div>
  );
}

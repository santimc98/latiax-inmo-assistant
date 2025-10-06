import { Injectable } from '@nestjs/common';

type Filters = {
  zona?: string;
  tipo?: 'alquiler' | 'venta';
  precio_max?: number;
  hab?: number;
  ascensor?: boolean;
  garaje?: boolean;
};

type InmovillaListing = {
  id: string;
  titulo: string;
  precio: number;
  zona: string;
  tipo: 'alquiler' | 'venta';
  ascensor: boolean;
  garaje: boolean;
  url: string;
};

const STUB: InmovillaListing[] = [
  {
    id: 'P-001',
    titulo: '2 hab Zaidin',
    precio: 750,
    zona: 'Zaidin',
    tipo: 'alquiler',
    ascensor: true,
    garaje: false,
    url: 'https://example.com/p001',
  },
  {
    id: 'P-002',
    titulo: '3 hab Centro',
    precio: 950,
    zona: 'Centro',
    tipo: 'alquiler',
    ascensor: true,
    garaje: true,
    url: 'https://example.com/p002',
  },
  {
    id: 'P-003',
    titulo: '1 hab Realejo',
    precio: 650,
    zona: 'Realejo',
    tipo: 'venta',
    ascensor: false,
    garaje: false,
    url: 'https://example.com/p003',
  },
];

@Injectable()
export class InmovillaService {
  search(filters: Filters) {
    const f = filters || {};

    return STUB.filter((p) => {
      if (f.zona && p.zona.toLowerCase() !== f.zona.toLowerCase()) {
        return false;
      }

      if (f.tipo && p.tipo !== f.tipo) {
        return false;
      }

      if (typeof f.precio_max === 'number' && p.precio > f.precio_max) {
        return false;
      }

      if (typeof f.hab === 'number' && !p.titulo.includes(`${f.hab} hab`)) {
        return false;
      }

      if (typeof f.ascensor === 'boolean' && p.ascensor !== f.ascensor) {
        return false;
      }

      if (typeof f.garaje === 'boolean' && p.garaje !== f.garaje) {
        return false;
      }

      return true;
    });
  }

  detail(id: string) {
    const base = STUB.find((p) => p.id === id) ?? STUB[0];

    return {
      id: base.id,
      titulo: base.titulo,
      precio: base.precio,
      m2: 72,
      hab: 2,
      banos: 1,
      ascensor: base.ascensor,
      garaje: base.garaje,
      descripcion: 'Luminoso y bien comunicado.',
      fotos: [],
    };
  }
}

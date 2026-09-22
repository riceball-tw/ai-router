export interface Order {
  id: string;
  placedAt: string;
  status: "delivered" | "shipped" | "processing" | "refunded";
  items: string[];
  total: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  blurb: string;
}

export const orders: Order[] = [
  {
    id: "ORD-1041",
    placedAt: "2026-09-18",
    status: "shipped",
    items: ["Aurora Wireless Headphones", "USB-C Braided Cable"],
    total: 249,
  },
  {
    id: "ORD-1037",
    placedAt: "2026-09-11",
    status: "delivered",
    items: ["Mesa Standing Desk"],
    total: 640,
  },
  {
    id: "ORD-1029",
    placedAt: "2026-08-30",
    status: "processing",
    items: ["Fern Espresso Machine", "Ceramic Cup Set"],
    total: 415,
  },
  {
    id: "ORD-1012",
    placedAt: "2026-08-02",
    status: "refunded",
    items: ["Trail Running Shoes"],
    total: 130,
  },
];

export const products: Product[] = [
  {
    id: "P-01",
    name: "Aurora Wireless Headphones",
    category: "Audio",
    price: 219,
    blurb: "Over-ear, 40h battery, adaptive noise cancelling.",
  },
  {
    id: "P-02",
    name: "Mesa Standing Desk",
    category: "Furniture",
    price: 640,
    blurb: "Electric height adjust, bamboo top, 4 memory presets.",
  },
  {
    id: "P-03",
    name: "Fern Espresso Machine",
    category: "Kitchen",
    price: 380,
    blurb: "Dual boiler, PID control, 58mm portafilter.",
  },
  {
    id: "P-04",
    name: "Trail Running Shoes",
    category: "Outdoor",
    price: 130,
    blurb: "Rock plate, 6mm drop, sticky rubber outsole.",
  },
  {
    id: "P-05",
    name: "Ceramic Cup Set",
    category: "Kitchen",
    price: 35,
    blurb: "Four 180ml cups, matte glaze, dishwasher safe.",
  },
  {
    id: "P-06",
    name: "USB-C Braided Cable",
    category: "Accessories",
    price: 30,
    blurb: "2m, 240W PD, 40Gbps data.",
  },
];

export const cart = [
  { productId: "P-05", qty: 2 },
  { productId: "P-06", qty: 1 },
];

import { products } from './products.js'

export const mockOrders = [
  {
    id: 'GN-24091',
    date: '2026-08-29',
    total: 1297,
    itemCount: 3,
    status: 'Shipped',
    stage: 'Shipped',
    address: 'Amit Sharma, 24 Park Street, Kolkata, West Bengal 700016, India',
    paymentSummary: 'Paid online - ₹1,297',
    products: [
      { ...products[0], quantity: 2, selectedSize: 'XL', selectedColor: 'White' },
      { ...products[1], quantity: 1, selectedSize: 'L', selectedColor: 'Black' },
    ],
  },
  {
    id: 'GN-24072',
    date: '2026-08-18',
    total: 1599,
    itemCount: 1,
    status: 'Delivered',
    stage: 'Delivered',
    address: 'Amit Sharma, 24 Park Street, Kolkata, West Bengal 700016, India',
    paymentSummary: 'Cash on delivery - ₹1,599',
    products: [{ ...products[16], quantity: 1, selectedSize: 'XL', selectedColor: 'Navy' }],
  },
  {
    id: 'GN-24044',
    date: '2026-08-04',
    total: 498,
    itemCount: 1,
    status: 'Processing',
    stage: 'Confirmed',
    address: 'Amit Sharma, 24 Park Street, Kolkata, West Bengal 700016, India',
    paymentSummary: 'Paid online - ₹498',
    products: [
      {
        ...products[0],
        type: 'custom',
        name: 'Premium Cotton Vest - Custom Design',
        quantity: 1,
        selectedSize: 'M',
        selectedColor: 'White',
        price: 498,
      },
    ],
  },
]

export const mockWishlistIds = [1, 6, 10, 15]

export const mockAddresses = [
  {
    id: 'addr-home',
    fullName: 'Amit Sharma',
    phone: '9876543210',
    line1: '24 Park Street',
    line2: 'Near Central Avenue',
    city: 'Kolkata',
    state: 'West Bengal',
    pinCode: '700016',
    country: 'India',
    isDefault: true,
  },
  {
    id: 'addr-work',
    fullName: 'Amit Sharma',
    phone: '9876543210',
    line1: '12 Business Road',
    line2: 'Suite 4B',
    city: 'Kolkata',
    state: 'West Bengal',
    pinCode: '700001',
    country: 'India',
    isDefault: false,
  },
]

export const mockSavedDesigns = [
  {
    id: 'design-premium-club',
    productId: 1,
    vestName: 'Premium Cotton Vest',
    color: 'White',
    size: 'XL',
    frontDesign: true,
    backDesign: false,
    lastEdited: '2026-08-30',
    image: products[0].image,
  },
  {
    id: 'design-black-fit',
    productId: 6,
    vestName: 'Signature Black Vest',
    color: 'Black',
    size: 'L',
    frontDesign: true,
    backDesign: true,
    lastEdited: '2026-08-21',
    image: products[5].image,
  },
]

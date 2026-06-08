export type EquipmentCategory =
  | 'CLOTHING'
  | 'WORKSHOP_MATERIAL'
  | 'OTHER';

export type EquipmentType = {
  id: string;
  name: string;
  category: EquipmentCategory;
};

export type EquipmentStock = {
  id: string;
  equipmentTypeId: string;
  size?: string;
  totalQuantity: number;
  availableQuantity: number;
  qrToken: string;
};

export type EquipmentIssue = {
  id: string;
  issuedAt: string; // ISO string
  closedAt?: string; // ISO string

  issuedByUserId: string;
  issuedToUserId: string;
  equipmentStockId: string;
};

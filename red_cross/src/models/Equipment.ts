export type EquipmentCategory =
  | 'CLOTHING'
  | 'WORKSHOP_MATERIAL'
  | 'OTHER';

export type EquipmentType = {
  id: string;
  name: string;
  category: EquipmentCategory;
};

export type EquipmentItemStatus =
  | 'AVAILABLE'
  | 'ISSUED'
  | 'RETIRED';

export type EquipmentItem = {
  id: string;
  equipmentTypeId: string;
  size?: string;
  status: EquipmentItemStatus;
  qrToken: string;
};

export type EquipmentIssue = {
  id: string;
  issuedAt: string; // ISO string
  closedAt?: string; // ISO string

  activityId?: string;
  issuedByUserId: string;
  issuedToUserId: string;
  equipmentItemId: string;
};
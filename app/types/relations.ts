export enum RelationType {
  MOTHER = 'MOTHER',
  FATHER = 'FATHER',
  SISTER = 'SISTER',
  BROTHER = 'BROTHER',
  SPOUSE = 'SPOUSE',
  PARTNER = 'PARTNER',
  GRANDMOTHER_MATERNAL = 'GRANDMOTHER_MATERNAL',
  GRANDMOTHER_PATERNAL = 'GRANDMOTHER_PATERNAL',
  GRANDFATHER_MATERNAL = 'GRANDFATHER_MATERNAL',
  GRANDFATHER_PATERNAL = 'GRANDFATHER_PATERNAL',
  AUNT_MATERNAL = 'AUNT_MATERNAL',
  AUNT_PATERNAL = 'AUNT_PATERNAL',
  UNCLE_MATERNAL = 'UNCLE_MATERNAL',
  UNCLE_PATERNAL = 'UNCLE_PATERNAL',
  COUSIN = 'COUSIN',
  FRIEND = 'FRIEND',
  OTHER_CUSTOM = 'OTHER_CUSTOM'
}

export const relationLabels: Record<RelationType, string> = {
  MOTHER: 'Anne',
  FATHER: 'Baba',
  SISTER: 'Kız Kardeş',
  BROTHER: 'Erkek Kardeş',
  SPOUSE: 'Eş',
  PARTNER: 'Sevgili',
  GRANDMOTHER_MATERNAL: 'Anneanne',
  GRANDMOTHER_PATERNAL: 'Babaanne',
  GRANDFATHER_MATERNAL: 'Anne tarafı Dede',
  GRANDFATHER_PATERNAL: 'Baba tarafı Dede',
  AUNT_MATERNAL: 'Teyze',
  AUNT_PATERNAL: 'Hala',
  UNCLE_MATERNAL: 'Dayı',
  UNCLE_PATERNAL: 'Amca',
  COUSIN: 'Kuzen',
  FRIEND: 'Arkadaş',
  OTHER_CUSTOM: 'Diğer'
};

export const multipleAllowedTypes = [
  RelationType.AUNT_MATERNAL,
  RelationType.AUNT_PATERNAL,
  RelationType.UNCLE_MATERNAL,
  RelationType.UNCLE_PATERNAL,
  RelationType.COUSIN,
  RelationType.FRIEND,
  RelationType.OTHER_CUSTOM
];

export interface RelationSettings {
  visibleTypes: RelationType[];
}

export default { RelationType, relationLabels }; 
export type Program =
  | 'FIRST_AID'
  | 'RPPSO'
  | 'DRR'
  | 'PHV'
  | 'ANTITRAFFICKING'
  | 'HEALTH'
  | 'LIFESAVING'
  | 'DUNJ';

export type Competency = {
  id: string;
  program: Program;
  level: string;
};
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "personas" })
export class Persona {
  @PrimaryGeneratedColumn({ type: "int" })
  id!: number;

  @Column({ type: "varchar", length: 100 })
  nombre!: string;

  // nullable en BD para no romper DB_SYNCHRONIZE con filas ya existentes;
  // la API lo exige como obligatorio al crear una persona.
  @Column({ type: "varchar", length: 150, unique: true, nullable: true })
  correo!: string | null;

  @Column({ type: "int" })
  dia!: number;

  @Column({ type: "int" })
  mes!: number;

  @Column({ type: "boolean", default: true })
  activo!: boolean;
}

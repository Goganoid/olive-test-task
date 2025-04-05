import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1743846071958 implements MigrationInterface {
  name = 'InitialMigration1743846071958';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "media_metadata" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "size" bigint, "type" character varying, "key" character varying NOT NULL, "created" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6c52273ad7331542bbce7ae4da1" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "media_metadata"`);
  }
}

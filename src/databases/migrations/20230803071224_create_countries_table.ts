import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('countries', table => {
        table.charset('utf8mb4');

        table.bigIncrements('id').unsigned().primary();
        table.specificType('iso', 'char(2)').notNullable()
        table.string('name', 80).notNullable();
        table.string('nicename', 80).notNullable();
        table.string('iso3', 3).nullable();
        table.integer('numCode').nullable();
        table.integer('phoneCode').notNullable();

        table.string('flagPublicId', 2048).nullable();
        table.string('flagUrl', 2048).nullable();
    
        table.timestamp('createdAt').defaultTo(knex.fn.now());
        table.timestamp('updatedAt').defaultTo(knex.fn.now());
        table.timestamp('deletedAt').nullable().defaultTo(null);
    });

    await knex.schema.raw(`
    ALTER TABLE countries
    ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
  `);

  // UNIQUE KEY (iso, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX countries_iso_unarchived_uindex
    ON countries (iso, unarchived)
  `);
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('countries');
}


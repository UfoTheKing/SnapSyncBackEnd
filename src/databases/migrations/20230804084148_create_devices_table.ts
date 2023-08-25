import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('devices', table => {
        table.charset('utf8mb4');

        table.bigIncrements('id').unsigned().primary();
        table.uuid('uuid').notNullable();

        table.string('brand').nullable(); // https://docs.expo.dev/versions/latest/sdk/device/ -> null on web
        table.string('osName').nullable(); // https://docs.expo.dev/versions/latest/sdk/device/
        table.string('osVersion').nullable(); // https://docs.expo.dev/versions/latest/sdk/device/
        table.string('modelName').nullable(); // https://docs.expo.dev/versions/latest/sdk/device/
        table.string('platformOs').nullable();
        table.string('latitude', 255).nullable();
        table.string('longitude', 255).nullable();
    
        table.timestamp('createdAt').defaultTo(knex.fn.now());
        table.timestamp('updatedAt').defaultTo(knex.fn.now());
        table.timestamp('deletedAt').nullable().defaultTo(null);
    });

    await knex.schema.raw(`
    ALTER TABLE devices
    ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
  `);

  // UNIQUE KEY (uuid, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX devices_uuid_unarchived_uindex
    ON devices (uuid, unarchived)
  `);
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('devices');
}


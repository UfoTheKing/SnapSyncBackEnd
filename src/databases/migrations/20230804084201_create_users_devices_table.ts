import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('users_devices', table => {
        table.charset('utf8mb4');

        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();
        table.bigInteger('deviceId').unsigned().index().references('id').inTable('devices').onDelete('CASCADE').notNullable();
    
        table.timestamp('createdAt').defaultTo(knex.fn.now());
        table.timestamp('updatedAt').defaultTo(knex.fn.now());
        table.timestamp('deletedAt').nullable().defaultTo(null);
    });

    await knex.schema.raw(`
    ALTER TABLE users_devices
    ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
    `);

    // UNIQUE KEY (userId, deviceId, unarchived)
    await knex.schema.raw(`
    CREATE UNIQUE INDEX ud_userId_deviceId_unarchived_uindex
    ON users_devices (userId, deviceId, unarchived)
    `);
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('users_devices');
}


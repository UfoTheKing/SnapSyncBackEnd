import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('expo_push_tokens', table => {
        table.charset('utf8mb4');

        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();
        table.bigInteger('deviceId').unsigned().index().references('id').inTable('devices').onDelete('CASCADE').notNullable();

        table.string('token').notNullable().unique();

        table.unique(['userId', 'deviceId']);
    
        table.timestamp('createdAt').defaultTo(knex.fn.now());
        table.timestamp('updatedAt').defaultTo(knex.fn.now());
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('expo_push_tokens');
}


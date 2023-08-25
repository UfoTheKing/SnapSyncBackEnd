import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
    // Deletes ALL existing entries
    await knex("friendship_statuses").del();

    // Inserts seed entries
    await knex("friendship_statuses").insert([
        { id: 1, name: "Pending" },
        { id: 2, name: "Accepted" },
        { id: 3, name: "Rejected" }
    ]);
};

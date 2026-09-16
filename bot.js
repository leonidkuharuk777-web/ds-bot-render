
require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ==========================================
// FAKE BAN DATABASE
// ==========================================

const fakeBanned = new Map();

// ==========================================
// COMMANDS
// ==========================================

const commands = [

    new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Заблокировать пользователя в этом боте")
    .addUserOption(option =>
        option
            .setName("user")
            .setDescription("Кого заблокировать")
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName("reason")
            .setDescription("Причина блокировки")
            .setRequired(true)
    ),

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Снять  блокировку")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("С кого снять блокировку")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("banlist")
        .setDescription("Показать список  заблокированных"),

    new SlashCommandBuilder()
        .setName("banstatus")
        .setDescription("Проверить статус пользователя")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Кого проверить")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Проверить работу бота")

].map(command => command.toJSON());

// ==========================================
// REGISTER COMMANDS
// ==========================================

async function registerCommands() {

    const rest = new REST({ version: "10" })
        .setToken(TOKEN);

    try {

        console.log("Регистрация slash-команд...");

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log("Slash-команды зарегистрированы.");

    } catch (error) {

        console.error(
            "Ошибка регистрации команд:",
            error
        );

    }
}

// ==========================================
// READY
// ==========================================

client.once("clientReady", () => {

    console.log("");
    console.log("=================================");
    console.log("       FAKE BAN DISCORD BOT");
    console.log("=================================");
    console.log(`Бот: ${client.user.tag}`);
    console.log(`Серверов: ${client.guilds.cache.size}`);
    console.log("=================================");
    console.log("");

});

// ==========================================
// INTERACTION
// ==========================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) {
        return;
    }

    const command = interaction.commandName;

    // ======================================
    // PING
    // ======================================

    if (command === "ping") {

        await interaction.reply({
            content: `🏓 Pong!\nЗадержка: ${client.ws.ping} мс`,
            ephemeral: true
        });

        return;
    }

    // ======================================
    // CHECK FAKE BAN
    // ======================================

    if (fakeBanned.has(interaction.user.id)) {

        // Разрешаем самому владельцу/админу
        // использовать команды управления.
        if (
            command !== "unban" &&
            command !== "banlist"
        ) {

            await interaction.reply({
                content:
                    "🚫 **ДОСТУП ЗАПРЕЩЁН**\n\n" +
                    "Ты находишься в списке заблокированных пользователей этого бота.",
                ephemeral: true
            });

            return;
        }
    }

    // ======================================
    // FAKEBAN
    // ======================================

    if (command === "ban") {

        const target =
            interaction.options.getUser("user");

        if (!target) {
            await interaction.reply({
                content: "❌ Пользователь не найден.",
                ephemeral: true
            });
            return;
        }
const reason =
    interaction.options.getString("reason");
        // Нельзя fakeban самого бота
        if (target.bot) {

            await interaction.reply({
                content:
                    "🤖 Нельзя заблокировать бота.",
                ephemeral: true
            });

            return;
        }

        // Проверяем права
        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.BanMembers
            )
        ) {

            await interaction.reply({
                content:
                    "❌ У тебя нет права использовать `/fakeban`.",
                ephemeral: true
            });

            return;
        }

        fakeBanned.set(target.id, {
    id: target.id,
    name: target.tag,
    moderator: interaction.user.id,
    reason: reason,
    date: Date.now()
});

        await interaction.reply({
    content:
        `🚨 **BAN**\n\n` +
        `👤 Пользователь: ${target}\n` +
        `📝 Причина: **${reason}**\n` +
        `🔨 Заблокирован внутри системы бота.\n\n` +
        `⚠️ Это не настоящий Discord-бан.`,
    allowedMentions: {
        users: []
    }
});

        console.log(
            `[FAKEBAN] ${target.tag} заблокирован пользователем ${interaction.user.tag}`
        );

        return;
    }

    // ======================================
    // UNFAKEBAN
    // ======================================

    if (command === "unban") {

        const target =
            interaction.options.getUser("user");

        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.BanMembers
            )
        ) {

            await interaction.reply({
                content:
                    "❌ У тебя нет права использовать эту команду.",
                ephemeral: true
            });

            return;
        }

        if (!fakeBanned.has(target.id)) {

            await interaction.reply({
                content:
                    `ℹ️ ${target.tag} не находится в fake-ban.`,
                ephemeral: true
            });

            return;
        }

        fakeBanned.delete(target.id);

        await interaction.reply({
            content:
                `✅ **BAN СНЯТ**\n\n` +
                `👤 ${target.tag} снова может использовать бота.`
        });

        console.log(
            `[UNFAKEBAN] ${target.tag} разблокирован`
        );

        return;
    }

    // ======================================
    // FAKEBAN LIST
    // ======================================

    if (command === "banlist") {

        if (fakeBanned.size === 0) {

            await interaction.reply({
                content:
                    "📋 Список fake-ban пуст.",
                ephemeral: true
            });

            return;
        }

        let text =
            "📋 **FAKE BAN LIST**\n\n";

        let number = 1;

        for (const entry of fakeBanned.values()) {

            const user =
                await client.users.fetch(entry.id)
                    .catch(() => null);

            const name =
                user
                    ? user.tag
                    : entry.name;

            text +=
                `**${number}.** ${name}\n`;

            number++;
        }

        await interaction.reply({
            content: text,
            ephemeral: true
        });

        return;
    }

    // ======================================
    // FAKEBAN STATUS
    // ======================================

    if (command === "banstatus") {

        const target =
            interaction.options.getUser("user")
            || interaction.user;

        if (fakeBanned.has(target.id)) {

            const data =
                fakeBanned.get(target.id);

            await interaction.reply({
                content:
                    `🚫 **${target.tag}** находится в ban.\n` +
                    `📅 Добавлен: <t:${Math.floor(data.date / 1000)}:R>`,
                ephemeral: true
            });

        } else {

            await interaction.reply({
                content:
                    `✅ **${target.tag}** не заблокирован.`,
                ephemeral: true
            });

        }

        return;
    }

});

// ==========================================
// START
// ==========================================

async function start() {

    if (!TOKEN) {
        console.error(
            "❌ DISCORD_TOKEN не указан в .env"
        );
        return;
    }

    if (!CLIENT_ID) {
        console.error(
            "❌ CLIENT_ID не указан в .env"
        );
        return;
    }

    if (!GUILD_ID) {
        console.error(
            "❌ GUILD_ID не указан в .env"
        );
        return;
    }

    await registerCommands();

    await client.login(TOKEN);
}

start();


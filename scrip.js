function generateBot() {
  const token = document.getElementById("token").value.trim();
  const name = document.getElementById("cmdName").value.trim();
  const code = document.getElementById("cmdCode").value.trim();

  if (!token || !name || !code) {
    alert("Please fill all fields.");
    return;
  }

  const finalCode = `const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder().setName('${name}').setDescription('Custom command')
];

const rest = new REST({ version: '10' }).setToken('${token}');
(async () => {
  try {
    await rest.put(Routes.applicationCommands('YOUR_CLIENT_ID'), { body: commands });
    console.log('Command registered.');
  } catch (err) {
    console.error(err);
  }
})();

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === '${name}') {
    ${code}
  }
});

client.once(Events.ClientReady, () => {
  console.log('Bot is online!');
});

client.login('${token}');`;

  document.getElementById("output").value = finalCode;
}

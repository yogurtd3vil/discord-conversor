const Discord = require('discord.js');
const child_process = require('child_process');
const fetch = require('cross-fetch');
const fs = require('fs');
const config = require('./config.json')
const tmpDir = './tmp'; 

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir);
}

const client = new Discord.Client({
	intents: [
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMessages,
		Discord.GatewayIntentBits.MessageContent,
		Discord.GatewayIntentBits.GuildMembers,
	],
});


client.on("ready", async () => { console.log(`Bot iniciado como ${client.user.tag}!`);})

client.on(Discord.Events.MessageCreate, async function (message) {
    if(message.content == "conversormenu") {
        await message.delete().catch(err => {})
        const Botao = new Discord.ActionRowBuilder()
        .addComponents(
          new Discord.ButtonBuilder()
          .setCustomId('iniciarC')
          .setLabel('Iniciar')
          .setStyle(Discord.ButtonStyle.Success)
      )
        const Editor = new Discord.EmbedBuilder()
        .setAuthor({ name: message.guild.name + ' - Conversor', iconURL: message.guild.iconURL({ dynamic: true }), url: null })
        .addFields(
            { name: `Funcionamento do conversor:`, value: `\`1\` Separe seu arquivo GIF e selecione a opção de conversor;\n\`2\` Um canal será criado logo abaixo para você;\n\`3\` Formatos aceitos: \`.mp4\` \`.mov\`  \`.avi\` .` },
            { name: `Outras informações:`, value: `\`・\` Antes de iniciar, tenha o arquivo pronto em mãos;\n\`・\` Apenas os primeiros 5 segundos do vídeo serão convertidos;` }
        )
        .setThumbnail(message.guild.iconURL({dynamic: true}))
        .setColor("#2b2d31")
        message.channel.send({embeds: [Editor], components: [Botao]})
    }
  })

  client.on(Discord.Events.InteractionCreate, async function (interaction) {
    if (interaction.isButton()) {
        if(interaction.customId == "iniciarC") {
            const name = `💿・${interaction.user.id}`;
            let f = await interaction.guild.channels.cache.find(
                c => c.name === name
              );
              if (f)
              return interaction.reply({
                content: `Você já tem um canal de conversão aberto! <#${f.id}>`
              });

              await interaction.guild.channels.create({
                name: name,
                type: Discord.ChannelType.GuildText,
                topic: interaction.user.id,
                parent: interaction.channel.parentId,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone,
                        deny: [Discord.PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [Discord.PermissionsBitField.Flags.ViewChannel, Discord.PermissionsBitField.Flags.AttachFiles, Discord.PermissionsBitField.Flags.SendMessages, Discord.PermissionsBitField.Flags.ReadMessageHistory]
                    }
                ]
            }).then(async (channel) => {
                const row = new Discord.ActionRowBuilder()
                .addComponents(
                  new Discord.ButtonBuilder()
                  .setCustomId('iniciarCompressao')
                  .setLabel('Iniciar')
                  .setStyle(Discord.ButtonStyle.Success)
              )
                .addComponents(
                  new Discord.ButtonBuilder()
                  .setCustomId('cancelarCompressao')
                  .setLabel('Cancelar')
                  .setStyle(Discord.ButtonStyle.Danger)
                )
                const Compressor = new Discord.EmbedBuilder()
                .setAuthor({ name: interaction.guild.name + ' - Conversor', iconURL: interaction.guild.iconURL({ dynamic: true }), url: null })
                .setColor("#2b2d31")
                .setDescription(`Para iniciar sua compressão leia as informações abaixo:`)
                .addFields(
                    { name: `Como funciona?`, value: `\`1\` Clique no botão abaixo para iniciar a conversão;\n\`2\` Envie o arquivo e aguarde a conversão.` }
                )
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setFooter({text: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                channel.send({embeds: [Compressor], components: [row]})
        })
        }

        if(interaction.customId == "iniciarCompressao") {
            await interaction.message.delete().catch(err => {})
            const rowC = new Discord.ActionRowBuilder()
            .addComponents(
              new Discord.ButtonBuilder()
              .setCustomId('cancelarCompressao')
              .setLabel('Cancelar')
              .setStyle(Discord.ButtonStyle.Danger)
            )
            const responseMessage = await interaction.reply({ content: `<@${interaction.user.id}>, envie o video.`, components: [rowC]})
            const filter = msg => msg.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 25000 });
            collector.on('collect', async msg => {
                await msg.delete().catch(err => {})
                await responseMessage.delete().catch(err => {})
                const attachment = msg.attachments.first();
                if(!attachment) return await interaction.message.channel.send({ content: 'não encontrei anexos!', components: [rowC] });
                if(attachment.url.includes(".gif")) return await interaction.message.channel.send({ content: 'você não pode usar arquivos desse formato',components: [rowC] });
                await interaction.message.channel.send({ content: `<@${interaction.user.id}>, recebi seu video e estou convertendo...` })
                const filename = attachment.name;
                const url = attachment.url;
                const outputFilename = `${string(5)}-yogurtd3vil.gif`; 
                try {
                    const response = await fetch(url);
                    const buffer = await response.buffer();
                    const tmpFilePath = `${tmpDir}/${filename}`;
                    fs.writeFileSync(tmpFilePath, buffer);
                    const command = `ffmpeg -i ${tmpFilePath} -ss 0 -t 5 -filter_complex "[0:v] fps=15,scale=300:-1,split [a][b];[a] palettegen [p];[b][p] paletteuse" ${tmpDir}/${outputFilename}`;
                    child_process.exec(command, async (error, stdout, stderr) => {
                        if (error) {
                            return await interaction.message.channel.send({ content: `<@${interaction.user.id}>, ocorreu um erro na conversão!`, components: [rowC] });
                        }
                        interaction.channel.bulkDelete(100)
                        const row = new Discord.ActionRowBuilder()
                        .addComponents(
                          new Discord.ButtonBuilder()
                          .setCustomId('cancelarCompressao')
                          .setLabel('Já baixei')
                          .setStyle(Discord.ButtonStyle.Success)
                        )
                    await interaction.message.channel.send({ files: [`${tmpDir}/${outputFilename}`], components: [row]})
                    fs.unlinkSync(tmpFilePath);
                    fs.unlinkSync(`${tmpDir}/${outputFilename}`);
                })
                } catch(err) {
                    return await interaction.message.channel.send({ content: `<@${interaction.user.id}>, ocorreu um erro na conversão!` ,components: [rowC] });
                }
        })
        }

        if(interaction.customId == 'cancelarCompressao') {
            await interaction.channel.delete().catch(err => {})
          }
          
    }
  })


  function string(length) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  client.login(config.token)
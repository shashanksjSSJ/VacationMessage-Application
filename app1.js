const nodemailer = require('nodemailer')
const {google} = require('googleapis')


const CLIENT_ID = '99020234317-l27rjtg4978v1l75n5v3t6s778kf5of4.apps.googleusercontent.com'
const CLIENT_SECRET = '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'
const REDIRECT_URI = 'https://developers.google.com/oauthplayground'
const REFRESH_TOKEN = '1//04k3Ek4op05JWCgYIARAAGAQSNwF-L9Irk57z7OGCWNGGrz1Oz39zBXDo71EVpX1T1vybgIdqmD_GLHwEEWgxZ71f7rSDmxcfgAE'
const VACATION_REPLY_LABEL = 'VacationReplyLabel';
const SENT_REPLY_LABEL = 'SentVacationReplyLabel';


const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token: REFRESH_TOKEN})
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });


async function sendMail(){
    try {
        const accessToken = await oAuth2Client.getAccessToken()

        const transport = nodemailer.createTransport({
            service: 'gmail', 
            auth: {
                type: 'OAuth2', 
                user: 'shashanksj26@gmail.com',
                clientId: CLIENT_ID, 
                clientSecret: CLIENT_SECRET, 
                refreshToken: REFRESH_TOKEN, 
                accessToken: accessToken
            }
        })

        const mailOptions = {
            from:'shashanksj26@gmail.com', 
            to: 'shashanksj.is20@rvce.edu.in', 
            subject: 'Hello from gmail using API', 
            text: "Hello From Gmail Email using API hope it works", 
        }; 

        const result = await transport.sendMail(mailOptions)
        return result
    } 
    catch (error) {
        return error; 
    }
}

  
async function listUnrepliedEmailsToday(gmail) {
    const currentDate = new Date().toISOString().split('T')[0];
  
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${currentDate} is:unread -label:${SENT_REPLY_LABEL}`,
    });
  
    const unrepliedEmails = response.data.messages || [];
  

    const filteredUnrepliedEmails = unrepliedEmails.filter((email) => {
      const senderEmail = getEmailSender(gmail, email.id);
      return !isSystemGeneratedEmail(senderEmail);
    });
  
    return filteredUnrepliedEmails;
  }

  function isSystemGeneratedEmail(senderEmail) {
   
    const email = senderEmail && senderEmail[0] && senderEmail[0].value;
  
    return email && (email.includes('mailer-daemon') || email.includes('postmaster'));
  }

  
 
  async function addLabelAndMoveEmail(gmail, messageId, labelName) {
    const labelId = await createLabelIfNotExists(gmail, labelName);
  
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: { addLabelIds: [labelId] },
    });
  }
  

  async function createLabelIfNotExists(gmail, labelName) {
    const existingLabels = await gmail.users.labels.list({ userId: 'me' });
    const label = existingLabels.data.labels.find((l) => l.name === labelName);
  
    if (label) {
      return label.id;
    } else {
      const createdLabel = await gmail.users.labels.create({
        userId: 'me',
        resource: { name: labelName },
      });
      return createdLabel.data.id;
    }
  }

  async function sendVacationReply(gmail,senderEmail, threadId) {
    try {
      
  
      const vacationReply = `
        <p>Thank you for your email!</p>
        <p>I'm currently out of the office and will respond to your email as soon as possible.</p>
        <p>Best regards,<br>Your Name</p>
      `;
  
      const rawVacationReply = Buffer.from(
        `From: ${process.env.EMAIL_ADDRESS}\r\n` +
        `To: ${senderEmail}\r\n` +
        'Content-Type: text/html; charset=utf-8\r\n' +
        'MIME-Version: 1.0\r\n' +
        `Subject: Re: Your Subject Here\r\n\r\n` +
        vacationReply
      ).toString('base64');
  
      await gmail.users.messages.send({
        userId: 'me',
        resource: {
          raw: rawVacationReply,
          threadId: threadId,
        },
      });
  
      console.log(`Vacation Reply sent to ${senderEmail}`);
    } catch (error) {
      console.error('Error sending Vacation Reply:', error.message);
      throw error;
    }
  }

  async function getEmailSender(gmail, messageId) {
    const message = await gmail.users.messages.get({ userId: 'me', id: messageId });
    const sender = message.data.payload.headers.find(header => header.name === 'From');
    return sender ? sender.value : null;
  }

  async function executeVacationReply() {
    try {
      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
      const unrepliedEmails = await listUnrepliedEmailsToday(gmail);
  
      for (const email of unrepliedEmails) {
        try {
          const senderEmail = await getEmailSender(gmail, email.id);
          await sendVacationReply(gmail,senderEmail, email.threadId);
          await addLabelAndMoveEmail(gmail, email.id, SENT_REPLY_LABEL);
        } catch (error) {
          console.error(`Error processing email ${email.id}: ${error.message}`);
        }
      }
  
      console.log('Vacation replies sent successfully');
    } catch (error) {
      console.error('Error executing Vacation Reply:', error.message);
    } finally {
    // const nextExecutionTime = Math.floor(Math.random() * (120 - 45 + 1) + 45) * 1000;
    const nextExecutionTime = 10*1000;
    setTimeout(executeVacationReply, nextExecutionTime);
    }
  }


executeVacationReply().then(()=>console.log("excecution compelted")).catch(error=>console.error('Error during excecution', error)); 

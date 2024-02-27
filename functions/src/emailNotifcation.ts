const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "nik.evincedev@gmail.com", //TO-DO added user name for host
    pass: "ophnkhxrrjuredbu", //TO-DO added password for host
  },
});

export async function sendEmail(body: any, emails: any, subject: any) {
  console.log("post", body);
  var buffer;
  if (body.image.file_url) {
    buffer = body.image.file_url;
  } else {
    buffer = body.image;
  }
  const dest = ["nik.evincedev@gmail.com"];
  const mailOptions = {
    from: '"Nik Evincedev" <nik.evincedev@gmail.com>', // Something like: Jane Doe <janedoe@gmail.com>
    to: dest,
    subject: subject, // email subject
    html: `<p style="font-size: 16px;">${subject} Please Check on Platform!!</p>
                <br />
                <h3>${body.title ? body.title : body.name}</h3>
            `, // email content in HTML
    attachments: [
      {
        // filename: "image.png",
        path: buffer,
        cid: "hello+1@getpolyplatform.com",
      },
    ],
  };
  transporter.sendMail(mailOptions, (erro: any, info: any) => {
    if (erro) {
      return console.log(erro.toString());
    }
    return console.log("send", info);
  });
}

export async function sendAdminEmail(body: any, emails: any, subject: any) {
  console.log("post", body);
  var buffer;
  if (body.image.file_url) {
    buffer = body.image.file_url;
  } else {
    buffer = body.image;
  }
  const dest = ["nik.evincedev@gmail.com"];
  const mailOptions = {
    from: '"Nik Evincedev" <nik.evincedev@gmail.com>', // Something like: Jane Doe <janedoe@gmail.com>
    to: dest,
    subject: subject, // email subject
    html: `<p style="font-size: 16px;">${subject} from ${body.createdByName} </p>
                <br />
                <p> <b>Title : </b> ${body.title}</p>
                <p> <b>Location : </b> ${body.location}</p>
                <p> <b>Contact : </b> ${body.contact}</p>
                <p> <b>Detail : </b> ${body.details}</p>
            `, // email content in HTML
    attachments: [
      {
        // filename: "image.png",
        path: buffer,
        //cid: "hello+1@getpolyplatform.com"
      },
    ],
  };
  transporter.sendMail(mailOptions, (erro: any, info: any) => {
    if (erro) {
      return console.log(erro.toString());
    }
    return console.log("send", info);
  });
}

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const token = req.query.token;

  if (!token) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(401).send(`
      <html>
        <head>
          <title>Access Denied</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; background: #0a0a0f; color: #e8e9ee; }
            h1 { color: #ff5470; }
            .container { border: 1px solid rgba(255,84,112,0.3); padding: 30px; border-radius: 8px; display: inline-block; background: #0e1424; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Access Denied</h1>
            <p>A valid download token is required to access this file.</p>
            <p>If you recently purchased the book, please return to the checkout success page to get a new download link.</p>
          </div>
        </body>
      </html>
    `);
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback_local_test_secret_12345';

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, jwtSecret);

    // Get the absolute path to the PDF file (stored in the root of the workspace)
    const filePath = path.join(__dirname, '..', 'the-agentic-entrepreneur-mmt-edition.pdf');

    if (!fs.existsSync(filePath)) {
      console.error('PDF file not found at path:', filePath);
      return res.status(404).json({ success: false, error: 'Book file not found on server.' });
    }

    // Get file size
    const stat = fs.statSync(filePath);

    // Set download headers
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="the-agentic-entrepreneur-mmt-edition.pdf"');

    // Create a read stream and pipe it to response
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);

  } catch (error) {
    console.error('JWT Verification Error:', error);
    res.setHeader('Content-Type', 'text/html');
    return res.status(403).send(`
      <html>
        <head>
          <title>Download Link Expired</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; background: #0a0a0f; color: #e8e9ee; }
            h1 { color: #ff5470; }
            .container { border: 1px solid rgba(255,84,112,0.3); padding: 30px; border-radius: 8px; display: inline-block; background: #0e1424; }
            a { color: #00ff9f; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Download Link Expired or Invalid</h1>
            <p>For security, ebook download links are time-limited and expire after 5 minutes.</p>
            <p>Please refresh your checkout success page to generate a fresh download link, or contact support.</p>
          </div>
        </body>
      </html>
    `);
  }
};

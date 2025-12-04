const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Store browser instance for reuse
let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  }
  return browser;
}

// Load HTML templates
const templatesDir = path.join(__dirname, 'templates');

function loadTemplate(name) {
  return fs.readFileSync(path.join(templatesDir, `${name}.html`), 'utf-8');
}

// Replace template variables
function renderTemplate(template, data) {
  let html = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, value ?? '');
  }
  return html;
}

// Format currency helper
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Format date helper
function formatDate(date) {
  return new Date(date || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pdf-service' });
});

// Generate Seller Net Sheet PDF
app.post('/api/pdf/net-sheet', async (req, res) => {
  try {
    const {
      property,
      salePrice,
      loanPayoff,
      secondLoanPayoff,
      titleClosingCosts,
      governmentFees,
      commissions,
      sellerNet
    } = req.body;

    const template = loadTemplate('net-sheet');

    const html = renderTemplate(template, {
      // Property info
      propertyAddress: property?.address_full || 'N/A',
      propertyDetails: `${property?.beds || 0} bed | ${property?.baths_full || 0} bath | ${property?.sqft_living?.toLocaleString() || 0} sqft`,
      generatedDate: formatDate(),

      // Sale info
      salePrice: formatCurrency(salePrice || 0),

      // Loan payoffs
      firstLoanPayoff: formatCurrency(loanPayoff || 0),
      secondLoanPayoff: formatCurrency(secondLoanPayoff || 0),
      totalLoanPayoff: formatCurrency((loanPayoff || 0) + (secondLoanPayoff || 0)),

      // Title & Closing
      escrowFee: formatCurrency(titleClosingCosts?.escrowFee || 0),
      ownersTitlePolicy: formatCurrency(titleClosingCosts?.ownersTitlePolicy || 0),
      reconveyanceFee: formatCurrency(titleClosingCosts?.reconveyanceFee || 0),
      payoffDemand: formatCurrency(titleClosingCosts?.payoffDemand || 0),
      transactionFee: formatCurrency(titleClosingCosts?.transactionFee || 0),
      hoaResalePackage: formatCurrency(titleClosingCosts?.hoaResalePackage || 0),
      fedexCourier: formatCurrency(titleClosingCosts?.fedexCourier || 0),
      notarySigning: formatCurrency(titleClosingCosts?.notarySigning || 0),
      totalTitleClosing: formatCurrency(
        (titleClosingCosts?.escrowFee || 0) +
        (titleClosingCosts?.ownersTitlePolicy || 0) +
        (titleClosingCosts?.reconveyanceFee || 0) +
        (titleClosingCosts?.payoffDemand || 0) +
        (titleClosingCosts?.transactionFee || 0) +
        (titleClosingCosts?.hoaResalePackage || 0) +
        (titleClosingCosts?.fedexCourier || 0) +
        (titleClosingCosts?.notarySigning || 0)
      ),

      // Government fees
      propertyTaxProration: formatCurrency(governmentFees?.propertyTaxProration || 0),
      transferTax: formatCurrency(governmentFees?.transferTax || 0),
      totalGovernmentFees: formatCurrency(
        (governmentFees?.propertyTaxProration || 0) +
        (governmentFees?.transferTax || 0)
      ),

      // Commissions
      listingCommission: formatCurrency(commissions?.listingCommission || 0),
      buyerAgentCommission: formatCurrency(commissions?.buyerAgentCommission || 0),
      buyerCredit: formatCurrency(commissions?.buyerCredit || 0),
      homeWarranty: formatCurrency(commissions?.homeWarranty || 0),
      totalCommissions: formatCurrency(
        (commissions?.listingCommission || 0) +
        (commissions?.buyerAgentCommission || 0) +
        (commissions?.buyerCredit || 0) +
        (commissions?.homeWarranty || 0)
      ),

      // Final
      sellerNet: formatCurrency(sellerNet || 0)
    });

    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.75in',
        left: '0.5in'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; padding: 0 0.5in; display: flex; justify-content: space-between; align-items: center; color: #666;">
          <span>Grand Prix Realty | DRE #01234567</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    });

    await page.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="seller-net-sheet-${Date.now()}.pdf"`,
      'Content-Length': pdf.length
    });

    res.send(pdf);
  } catch (error) {
    console.error('Error generating net sheet PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

// Generate AVM Report PDF
app.post('/api/pdf/avm-report', async (req, res) => {
  try {
    const { property, valuation } = req.body;

    const template = loadTemplate('avm-report');

    const html = renderTemplate(template, {
      propertyAddress: property?.address_full || 'N/A',
      propertyDetails: `${property?.beds || 0} bed | ${property?.baths_full || 0} bath | ${property?.sqft_living?.toLocaleString() || 0} sqft`,
      yearBuilt: property?.year_built || 'N/A',
      lotSize: property?.sqft_lot?.toLocaleString() || 'N/A',
      generatedDate: formatDate(),

      estimatedValue: formatCurrency(valuation?.estimate || 0),
      confidenceScore: valuation?.confidence || 'N/A',
      valueLow: formatCurrency(valuation?.range_low || 0),
      valueHigh: formatCurrency(valuation?.range_high || 0),
      pricePerSqft: formatCurrency(valuation?.price_per_sqft || 0),

      comparablesCount: valuation?.comparables?.length || 0
    });

    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.75in',
        left: '0.5in'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; padding: 0 0.5in; display: flex; justify-content: space-between; align-items: center; color: #666;">
          <span>Grand Prix Realty | DRE #01234567</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    });

    await page.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="avm-report-${Date.now()}.pdf"`,
      'Content-Length': pdf.length
    });

    res.send(pdf);
  } catch (error) {
    console.error('Error generating AVM report PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit();
});

app.listen(PORT, () => {
  console.log(`PDF Service running on port ${PORT}`);
});

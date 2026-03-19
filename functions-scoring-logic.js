/**
 * Netlify Function: Scoring Logic
 * Calculates the Founder Bottleneck Indicator score (1-35)
 * and determines category (Green/Yellow/Red)
 * 
 * POST /.netlify/functions/scoring-logic
 */

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    
    // Validate all questions are present
    const questions = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];
    for (const q of questions) {
      if (!body[q] || body[q] < 1 || body[q] > 5) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Invalid question ${q}. Must be 1-5.` })
        };
      }
    }

    // Calculate total score
    const score = 
      parseInt(body.q1) +
      parseInt(body.q2) +
      parseInt(body.q3) +
      parseInt(body.q4) +
      parseInt(body.q5) +
      parseInt(body.q6) +
      parseInt(body.q7);

    // Determine category
    let category, message;
    if (score >= 7 && score <= 14) {
      category = 'Green';
      message = 'Operationally Structured';
    } else if (score >= 15 && score <= 24) {
      category = 'Yellow';
      message = 'Founder-Dependent Operations';
    } else if (score >= 25 && score <= 35) {
      category = 'Red';
      message = 'Operational Chaos Likely';
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Score out of valid range' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        score,
        category,
        message
      })
    };

  } catch (error) {
    console.error('Scoring error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to calculate score' })
    };
  }
};

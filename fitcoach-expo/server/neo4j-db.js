import neo4j from 'neo4j-driver';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fitcoach-ai-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Neo4j connection
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'neo4j://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

class Neo4jDB {
  constructor() {
    this.driver = driver;
  }

  async getSession() {
    return this.driver.session();
  }

  async close() {
    await this.driver.close();
  }

  // Initialize database schema
  async initialize() {
    const session = await this.getSession();
    try {
      // Create constraints and indexes
      await session.run(`
        CREATE CONSTRAINT user_email IF NOT EXISTS 
        FOR (u:User) REQUIRE u.email IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT user_id IF NOT EXISTS 
        FOR (u:User) REQUIRE u.id IS UNIQUE
      `);
      
      await session.run(`
        CREATE INDEX user_created_at IF NOT EXISTS 
        FOR (u:User) ON (u.created_at)
      `);

      console.log('Neo4j database initialized successfully');
    } catch (error) {
      console.error('Error initializing Neo4j database:', error);
    } finally {
      await session.close();
    }
  }

  // Auth methods
  async registerUser(userData) {
    const session = await this.getSession();
    try {
      const { name, email, password } = userData;
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      const result = await session.run(`
        CREATE (u:User {
          id: $id,
          name: $name,
          email: $email,
          password: $password,
          created_at: datetime(),
          updated_at: datetime()
        })
        RETURN u
      `, {
        id: userId,
        name,
        email,
        password: hashedPassword
      });

      if (result.records.length === 0) {
        throw new Error('Failed to create user');
      }

      const user = result.records[0].get('u').properties;
      delete user.password; // Don't return password

      return {
        user,
        token: this.generateToken(user.id)
      };
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  async loginUser(email, password) {
    const session = await this.getSession();
    try {
      const result = await session.run(`
        MATCH (u:User {email: $email})
        RETURN u
      `, { email });

      if (result.records.length === 0) {
        throw new Error('User not found');
      }

      const user = result.records[0].get('u').properties;
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        throw new Error('Invalid password');
      }

      delete user.password; // Don't return password

      return {
        user,
        token: this.generateToken(user.id)
      };
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  async getUserById(userId) {
    const session = await this.getSession();
    try {
      const result = await session.run(`
        MATCH (u:User {id: $userId})
        RETURN u
      `, { userId });

      if (result.records.length === 0) {
        return null;
      }

      const user = result.records[0].get('u').properties;
      delete user.password;
      return user;
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  async getUserByEmail(email) {
    const session = await this.getSession();
    try {
      const result = await session.run(`
        MATCH (u:User {email: $email})
        RETURN u
      `, { email });

      if (result.records.length === 0) {
        return null;
      }

      const user = result.records[0].get('u').properties;
      delete user.password;
      return user;
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  async updateUser(userId, updates) {
    const session = await this.getSession();
    try {
      const setClause = Object.keys(updates)
        .map(key => `u.${key} = $${key}`)
        .join(', ');
      
      const result = await session.run(`
        MATCH (u:User {id: $userId})
        SET ${setClause}, u.updated_at = datetime()
        RETURN u
      `, { userId, ...updates });

      if (result.records.length === 0) {
        return null;
      }

      const user = result.records[0].get('u').properties;
      delete user.password;
      return user;
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  // Chat methods
  async saveChatMessage(userId, role, content, macros = null) {
    const session = await this.getSession();
    try {
      const messageId = uuidv4();
      
      let query = `
        MATCH (u:User {id: $userId})
        CREATE (m:ChatMessage {
          id: $messageId,
          role: $role,
          content: $content,
          created_at: datetime()
        })
        CREATE (u)-[:SENT]->(m)
        RETURN m
      `;

      const params = { userId, messageId, role, content };

      if (macros) {
        query = `
          MATCH (u:User {id: $userId})
          CREATE (m:ChatMessage {
            id: $messageId,
            role: $role,
            content: $content,
            macros_kcal: $macros_kcal,
            macros_protein: $macros_protein,
            macros_carbs: $macros_carbs,
            macros_fat: $macros_fat,
            created_at: datetime()
          })
          CREATE (u)-[:SENT]->(m)
          RETURN m
        `;
        params.macros_kcal = macros.kcal || null;
        params.macros_protein = macros.protein || null;
        params.macros_carbs = macros.carbs || null;
        params.macros_fat = macros.fat || null;
      }

      const result = await session.run(query, params);
      return result.records[0].get('m').properties;
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  async getChatHistory(userId = null) {
    const session = await this.getSession();
    try {
      let query, params;

      if (userId) {
        // Get chat history for authenticated user
        query = `
          MATCH (u:User {id: $userId})-[:SENT]->(m:ChatMessage)
          RETURN m
          ORDER BY m.created_at ASC
        `;
        params = { userId };
      } else {
        // For guest users, return empty array or sample data
        return [];
      }

      const result = await session.run(query, params);
      return result.records.map(record => record.get('m').properties);
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  // Recipe methods
  async saveRecipe(userId, recipeData) {
    const session = await this.getSession();
    try {
      const recipeId = uuidv4();
      
      let query = `
        CREATE (r:Recipe {
          id: $recipeId,
          name: $name,
          description: $description,
          ingredients: $ingredients,
          instructions: $instructions,
          calories: $calories,
          protein: $protein,
          carbs: $carbs,
          fat: $fat,
          prep_time: $prep_time,
          cook_time: $cook_time,
          created_at: datetime()
        })
      `;

      const params = {
        recipeId,
        ...recipeData
      };

      if (userId) {
        query += `
          WITH r
          MATCH (u:User {id: $userId})
          CREATE (u)-[:CREATED]->(r)
        `;
        params.userId = userId;
      }

      query += ` RETURN r`;

      const result = await session.run(query, params);
      return result.records[0].get('r').properties;
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  async getRecipes(userId = null) {
    const session = await this.getSession();
    try {
      let query;

      if (userId) {
        // Get recipes for authenticated user
        query = `
          MATCH (u:User {id: $userId})-[:CREATED]->(r:Recipe)
          RETURN r
          ORDER BY r.created_at DESC
        `;
      } else {
        // For guest users, return public recipes or sample data
        query = `
          MATCH (r:Recipe)
          WHERE NOT (r)<-[:CREATED]-()
          RETURN r
          ORDER BY r.created_at DESC
          LIMIT 10
        `;
      }

      const result = await session.run(query, userId ? { userId } : {});
      return result.records.map(record => record.get('r').properties);
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  async deleteRecipe(recipeId, userId = null) {
    const session = await this.getSession();
    try {
      let query;
      let params = { recipeId };

      if (userId) {
        // Only delete if user owns the recipe
        query = `
          MATCH (u:User {id: $userId})-[:CREATED]->(r:Recipe {id: $recipeId})
          DETACH DELETE r
          RETURN count(r) as deleted
        `;
        params.userId = userId;
      } else {
        // For guest users, deny deletion or handle differently
        throw new Error('Guest users cannot delete recipes');
      }

      const result = await session.run(query, params);
      return result.records[0].get('deleted').toNumber() > 0;
    } catch (error) {
      throw error;
    } finally {
      await session.close();
    }
  }

  // JWT methods
  generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Middleware for token verification
  authMiddleware = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        const decoded = this.verifyToken(token);
        const user = await this.getUserById(decoded.userId);
        
        if (user) {
          req.user = user;
        }
      }
      
      // Continue regardless of auth status (supports guest mode)
      next();
    } catch (error) {
      // For guest mode, continue without user
      next();
    }
  };

  // Middleware to require authentication
  requireAuth = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = this.verifyToken(token);
      const user = await this.getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

export default Neo4jDB;

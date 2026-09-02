# Restaurant Management System - API Documentation

## Overview

This is a complete API documentation for the Restaurant Management System, a Laravel API-only application built with Spatie Laravel Permission for authorization and Sanctum for token-based authentication.

### Base URL

```
http://127.0.0.1:8000/api
```

### Authentication

All protected routes require the following HTTP header:

```
Authorization: Bearer {token}
```

Tokens are obtained via the `/login` endpoint and are valid for the duration of your session. Logout invalidates the current token.

### Standard Response Format

All responses follow this envelope structure:

**Success Response (HTTP 200, 201):**

```json
{
    "success": true,
    "message": "Success message here",
    "data": {
        // Response data varies by endpoint
    }
}
```

**Error Response (HTTP 4xx, 5xx):**

```json
{
    "success": false,
    "message": "Error message here",
    "errors": {
        // Validation errors (optional, only for 422)
    }
}
```

### Available Roles

- `admin` - Full system access
- `cashier` - Invoice and payment management
- `waiter` - Table, reservation, and order-taking workflow
- `chef` - Food preparation and cooking status updates

### Waiter Role Workflow

The waiter role is designed for table-service operations and order taking. A waiter can perform the following actions:

- View table availability: `GET /admin/tables/availability`
- Create reservations: `POST /admin/reservations`
- Create a pending invoice for a table: `POST /admin/invoices`
- Add food items to an invoice: `POST /admin/invoices/{invoice}/food`
- Merge the same food for the same person_number on the same invoice: same `POST` route
- View a specific invoice and its total: `GET /admin/invoices/{invoice}`
- Update an existing item quantity or note: `PUT /admin/invoices/{invoice}/food/{foodItem}`
- Increase or decrease quantity with delta logic: `PATCH /admin/invoices/{invoice}/food/{foodItem}/quantity`
- Cancel an invoice item: `DELETE /admin/invoices/{invoice}/food/{foodItem}`

The waiter is explicitly forbidden from:

- Changing food preparation status: `PATCH /admin/invoices/{invoice}/food/{foodItem}/status`
- Creating categories: `POST /admin/categories`
- Creating users: `POST /admin/users`
- Deleting foods: `DELETE /admin/foods/{id}`

**Waiter permissions in this system:** `manage_reservations`, `create_invoice`, `update_invoice_item`

### Chef Role Workflow

The chef role is designed for kitchen operations. A chef can:

- View all invoices and their food items: `GET /admin/invoices`
- View one invoice with its table, invoice items, and food details: `GET /admin/invoices/{invoice}`
- View the items for one invoice: `GET /admin/invoices/{invoice}/food`
- Update an item's preparation status: `PATCH /admin/invoices/{invoice}/food/{foodItem}/status`
- Progress an item through `pending` -> `preparing` -> `ready` -> `served`
- Mark a menu food item available or unavailable: `PUT /admin/foods/{food}`

**Chef permissions in this system:** `update_invoice_food_status`, `update_food`

#### Chef: Update Food Preparation Status

**PATCH** `/admin/invoices/{invoice}/food/{foodItem}/status`

Updates the preparation status of one food item on a pending invoice.

**Authentication:** Required (Bearer token)
**Permission:** `update_invoice_food_status` (assigned to the `chef` role)

**Request Body:**

```json
{
    "status": "preparing"
}
```

Allowed values are `pending`, `preparing`, `ready`, `served`, and `cancelled`. The normal chef workflow is `pending` -> `preparing` -> `ready` -> `served`.

**Success Response (200):**

```json
{
  "success": true,
  "message": "Invoice item status updated successfully",
  "data": {
    "id": 20,
    "invoice_id": 10,
    "food_id": 1,
    "quantity": 2,
    "status": "preparing",
    "food": {...}
  }
}
```

**Error Responses:** `403 Forbidden` without `update_invoice_food_status`, `404 Not Found` for a missing invoice or item, `409 Conflict` for a completed or cancelled invoice, and `422 Unprocessable Entity` for an invalid status.

#### Chef: Update Food Availability

**PUT** `/admin/foods/{food}`

Marks an existing menu item as available or unavailable when the kitchen cannot currently prepare it.

**Authentication:** Required (Bearer token)
**Permission:** `update_food` (assigned to the `chef` role)

**Request Body:**

```json
{
    "is_available": false
}
```

The response is `200 OK` and returns the updated food object in `data`.

#### Chef Restrictions

The following protected operations return `403 Forbidden` for a chef:

- Create, update, or delete invoices
- Create, update, or delete invoice items
- Adjust invoice item quantity: `PATCH /admin/invoices/{invoice}/food/{foodItem}/quantity`
- Create, update, or delete reservations
- Create, update, or delete categories or sub-categories
- Create, update, or delete users
- Create, update, or delete tables
- Create or delete food menu items

The chef can read invoice and food data, update food preparation status, and change `is_available`; the chef cannot change order quantities, notes, billing data, or other menu fields.

### CORS Configuration

The frontend is configured to run at `http://localhost:5173` and has full CORS access to this API.

### File Upload Notes

- Endpoints with file uploads (like `image_path`) require `multipart/form-data` encoding, NOT JSON
- For PUT requests with file uploads, use POST with `_method=PUT` field (Laravel method spoofing)
- Supported image formats: JPEG, PNG, JPG, GIF, SVG
- Maximum file size: 2MB

---

## Authentication Endpoints

### 1. Login

**POST** `/login`

Creates a new authentication token for a user.

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| email | string | Yes | Valid email format |
| password | string | Yes | User password |

**Success Response (200):**

```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "access_token": "1|abc123def456...",
        "token_type": "Bearer"
    }
}
```

**Error Response (401):**

```json
{
    "success": false,
    "message": "Invalid credentials",
    "errors": null
}
```

---

### 2. Get Current User

**GET** `/user`

Retrieves the currently authenticated user's profile.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Success Response (200):**

```json
{
    "success": true,
    "message": "User retrieved successfully",
    "data": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com",
        "email_verified_at": "2026-08-31T12:00:00.000000Z",
        "created_at": "2026-08-31T12:00:00.000000Z",
        "updated_at": "2026-08-31T12:00:00.000000Z"
    }
}
```

---

### 3. Logout

**POST** `/logout`

Revokes the current authentication token.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Success Response (200):**

```json
{
    "success": true,
    "message": "Logout successful",
    "data": null
}
```

---

## Admin: Users Management

### 1. List All Users

**GET** `/admin/users`

Retrieves all users with their assigned roles.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to all authenticated users)

**Success Response (200):**

```json
{
    "success": true,
    "message": "Users retrieved successfully",
    "data": [
        {
            "id": 1,
            "name": "Admin User",
            "email": "admin@example.com",
            "created_at": "2026-08-31T12:00:00.000000Z",
            "updated_at": "2026-08-31T12:00:00.000000Z",
            "roles": [
                {
                    "id": 1,
                    "name": "admin",
                    "guard_name": "web",
                    "created_at": "2026-08-31T12:00:00.000000Z",
                    "updated_at": "2026-08-31T12:00:00.000000Z",
                    "pivot": {
                        "model_id": 1,
                        "role_id": 1,
                        "model_type": "App\\Models\\User"
                    }
                }
            ]
        }
    ]
}
```

---

### 2. Get Specific User

**GET** `/admin/users/{id}`

Retrieves a specific user with their roles and permissions.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Path Parameters:**
| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| id | integer | Yes | User ID |

**Success Response (200):**

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "created_at": "2026-08-31T12:00:00.000000Z",
    "updated_at": "2026-08-31T12:00:00.000000Z",
    "all_permissions": [
      "create_invoice",
      "update_invoice",
      "cancel_invoice",
      "create_table",
      "update_table",
      "delete_table"
    ],
    "roles": [...]
  }
}
```

**Error Response (404):**

```json
{
    "success": false,
    "message": "User not found",
    "errors": null
}
```

---

### 3. Create User

**POST** `/admin/users`

Creates a new user with a role and optional permissions.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin users)

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | Yes | User full name, max 255 chars |
| email | string | Yes | Valid email, must be unique |
| password | string | Yes | Min 8 characters |
| password_confirmation | string | Yes | Must match password field |
| role | string | Yes | Valid role name (admin, cashier, waiter, chef) |
| permissions | array | No | Array of permission names to grant |
| permissions.\* | string | No | Individual permission name |

**Success Response (201):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 5,
    "name": "New User",
    "email": "newuser@example.com",
    "created_at": "2026-08-31T15:30:00.000000Z",
    "updated_at": "2026-08-31T15:30:00.000000Z",
    "all_permissions": ["create_invoice", "update_invoice"],
    "roles": [
      {
        "id": 2,
        "name": "cashier",
        "pivot": {...}
      }
    ]
  }
}
```

**Error Response (422):**

```json
{
    "success": false,
    "message": "The email has already been taken.",
    "errors": {
        "email": ["The email has already been taken."]
    }
}
```

---

### 4. Update User

**PUT** `/admin/users/{id}`

Updates an existing user's name, email, password, role, and/or permissions.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin users)

**Path Parameters:**
| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| id | integer | Yes | User ID |

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | No | User full name, max 255 chars |
| email | string | No | Valid email, must be unique (except current user) |
| password | string | No | Min 8 characters, requires password_confirmation |
| password_confirmation | string | No | Must match password field |
| role | string | No | Valid role name |
| permissions | array | No | Array of permission names (replaces existing) |

**Success Response (200):**

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": 5,
    "name": "Updated Name",
    "email": "updated@example.com",
    "all_permissions": [...],
    "roles": [...]
  }
}
```

---

### 5. Delete User

**DELETE** `/admin/users/{id}`

Deletes a user permanently.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin users)

**Path Parameters:**
| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| id | integer | Yes | User ID |

**Important:** Cannot delete your own account. Returns 403 if attempted.

**Success Response (200):**

```json
{
    "success": true,
    "message": "User deleted successfully",
    "data": null
}
```

**Error Response (403):**

```json
{
    "success": false,
    "message": "You cannot delete your own account",
    "errors": null
}
```

**Error Response (404):**

```json
{
    "success": false,
    "message": "User not found",
    "errors": null
}
```

---

### 6. Get Roles and Permissions

**GET** `/admin/roles-permissions`

Retrieves all available roles and permissions in the system.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Success Response (200):**

```json
{
    "success": true,
    "message": "Roles and permissions retrieved successfully",
    "data": {
        "roles": ["admin", "cashier", "waiter", "chef"],
        "permissions": [
            "create_invoice",
            "update_invoice",
            "cancel_invoice",
            "create_table",
            "update_table",
            "delete_table",
            "manage_reservations"
        ]
    }
}
```

---

## Admin: Categories

### 1. List All Categories

**GET** `/admin/categories`

Retrieves all product categories with sub-category counts.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Success Response (200):**

```json
{
    "success": true,
    "message": "Categories retrieved successfully",
    "data": [
        {
            "id": 1,
            "name": {
                "en": "Food",
                "ar": "طعام",
                "ku": "خواردن"
            },
            "image_path": "categories/abc123.jpg",
            "created_by": 1,
            "created_at": "2026-08-31T12:00:00.000000Z",
            "updated_at": "2026-08-31T12:00:00.000000Z",
            "sub_categories_count": 5
        }
    ]
}
```

---

### 2. Get Specific Category

**GET** `/admin/categories/{id}`

Retrieves a category with all its sub-categories.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "id": 1,
    "name": {
      "en": "Food",
      "ar": "طعام",
      "ku": "خواردن"
    },
    "image_path": "categories/abc123.jpg",
    "created_by": 1,
    "created_at": "2026-08-31T12:00:00.000000Z",
    "updated_at": "2026-08-31T12:00:00.000000Z",
    "sub_categories": [
      {
        "id": 1,
        "category_id": 1,
        "name": {...},
        "image_path": null,
        "created_by": 1,
        "created_at": "2026-08-31T12:00:00.000000Z",
        "updated_at": "2026-08-31T12:00:00.000000Z"
      }
    ]
  }
}
```

**Error Response (404):**

```json
{
    "success": false,
    "message": "Category not found",
    "errors": null
}
```

---

### 3. Create Category

**POST** `/admin/categories`

Creates a new category with multilingual names and optional image.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin/staff)

**Request Format:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | object | Yes | Multilingual name object |
| name.en | string | Yes | English name, max 255 chars |
| name.ar | string | Yes | Arabic name, max 255 chars |
| name.ku | string | Yes | Kurdish name, max 255 chars |
| image_path | file | No | Image file, max 2MB (JPEG, PNG, JPG, GIF, SVG) |

**Success Response (201):**

```json
{
    "success": true,
    "message": "Category created successfully",
    "data": {
        "id": 5,
        "name": {
            "en": "Beverages",
            "ar": "المشروبات",
            "ku": "خواردنەوە"
        },
        "image_path": "categories/xyz789.jpg",
        "created_by": 1,
        "created_at": "2026-08-31T15:30:00.000000Z",
        "updated_at": "2026-08-31T15:30:00.000000Z",
        "sub_categories": []
    }
}
```

---

### 4. Update Category

**POST** `/admin/categories/{id}` with `_method=PUT`

Updates an existing category.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin/staff)

**Request Format:** `multipart/form-data`

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| \_method | string | Yes | Must be "PUT" |
| name | object | No | Multilingual name object |
| name.en | string | No | English name, max 255 chars |
| name.ar | string | No | Arabic name, max 255 chars |
| name.ku | string | No | Kurdish name, max 255 chars |
| image_path | file | No | New image file, max 2MB |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "id": 5,
    "name": {...},
    "image_path": "categories/newimage.jpg",
    "created_by": 1,
    "created_at": "2026-08-31T15:30:00.000000Z",
    "updated_at": "2026-08-31T16:00:00.000000Z"
  }
}
```

---

### 5. Delete Category

**DELETE** `/admin/categories/{id}`

Deletes a category. Only possible if no sub-categories exist.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin/staff)

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
    "success": true,
    "message": "Category deleted successfully",
    "data": null
}
```

**Error Response (409):**

```json
{
    "success": false,
    "message": "Cannot delete category with existing sub-categories",
    "errors": null
}
```

---

## Admin: Sub-Categories

### 1. List All Sub-Categories

**GET** `/admin/sub-categories`

Retrieves all sub-categories with their parent category and food counts.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Success Response (200):**

```json
{
  "success": true,
  "message": "Sub-categories retrieved successfully",
  "data": [
    {
      "id": 1,
      "category_id": 1,
      "name": {
        "en": "Appetizers",
        "ar": "المقبلات",
        "ku": "دابڕێ"
      },
      "image_path": null,
      "created_by": 1,
      "created_at": "2026-08-31T12:00:00.000000Z",
      "updated_at": "2026-08-31T12:00:00.000000Z",
      "category": {
        "id": 1,
        "name": {...}
      },
      "foods_count": 12
    }
  ]
}
```

---

### 2. Get Specific Sub-Category

**GET** `/admin/sub-categories/{id}`

Retrieves a sub-category with its parent category and all foods.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Sub-category retrieved successfully",
  "data": {
    "id": 1,
    "category_id": 1,
    "name": {...},
    "image_path": null,
    "created_by": 1,
    "created_at": "2026-08-31T12:00:00.000000Z",
    "updated_at": "2026-08-31T12:00:00.000000Z",
    "category": {...},
    "foods": [...]
  }
}
```

---

### 3. Create Sub-Category

**POST** `/admin/sub-categories`

Creates a new sub-category under a parent category.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin/staff)

**Request Format:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| category_id | integer | Yes | Valid category ID |
| name | object | Yes | Multilingual name object |
| name.en | string | Yes | English name, max 255 chars |
| name.ar | string | Yes | Arabic name, max 255 chars |
| name.ku | string | Yes | Kurdish name, max 255 chars |
| image_path | file | No | Image file, max 2MB |

**Success Response (201):**

```json
{
  "success": true,
  "message": "Sub-category created successfully",
  "data": {
    "id": 10,
    "category_id": 1,
    "name": {...},
    "image_path": null,
    "created_by": 1,
    "created_at": "2026-08-31T15:30:00.000000Z",
    "updated_at": "2026-08-31T15:30:00.000000Z",
    "category": {...},
    "foods": []
  }
}
```

---

### 4. Update Sub-Category

**POST** `/admin/sub-categories/{id}` with `_method=PUT`

Updates an existing sub-category.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin/staff)

**Request Format:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| \_method | string | Yes | Must be "PUT" |
| category_id | integer | No | Valid category ID |
| name | object | No | Multilingual name object |
| image_path | file | No | New image file, max 2MB |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Sub-category updated successfully",
  "data": {...}
}
```

---

### 5. Delete Sub-Category

**DELETE** `/admin/sub-categories/{id}`

Deletes a sub-category. Only possible if no foods exist in it.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin/staff)

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
    "success": true,
    "message": "Sub-category deleted successfully",
    "data": null
}
```

**Error Response (409):**

```json
{
    "success": false,
    "message": "Cannot delete sub-category with existing foods",
    "errors": null
}
```

---

## Admin: Foods

### 1. List All Foods

**GET** `/admin/foods`

Retrieves all food items with their sub-category details.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Success Response (200):**

```json
{
  "success": true,
  "message": "Foods retrieved successfully",
  "data": [
    {
      "id": 1,
      "sub_category_id": 1,
      "name": {
        "en": "Hummus",
        "ar": "حمص",
        "ku": "مس"
      },
      "description": {
        "en": "Chickpea dip",
        "ar": "ديب الحمص",
        "ku": "مسی قایت"
      },
      "size": "Regular",
      "price": 5000,
      "image_path": "foods/hummus.jpg",
      "is_available": true,
      "created_by": 1,
      "created_at": "2026-08-31T12:00:00.000000Z",
      "updated_at": "2026-08-31T12:00:00.000000Z",
      "sub_category": {...}
    }
  ]
}
```

---

### 2. Get Specific Food

**GET** `/admin/foods/{id}`

Retrieves a specific food item with details.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Food retrieved successfully",
  "data": {...}
}
```

---

### 3. Create Food

**POST** `/admin/foods`

Creates a new food item.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin/staff)

**Request Format:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| sub_category_id | integer | Yes | Valid sub-category ID |
| name | object | Yes | Multilingual name |
| name.en | string | Yes | English name, max 255 chars |
| name.ar | string | Yes | Arabic name, max 255 chars |
| name.ku | string | Yes | Kurdish name, max 255 chars |
| description | object | No | Multilingual description |
| description.en | string | No | English description |
| description.ar | string | No | Arabic description |
| description.ku | string | No | Kurdish description |
| size | string | No | Portion size, max 100 chars |
| price | integer | Yes | Price in smallest currency unit, min 0 |
| is_available | boolean | No | Defaults to true |
| image_path | file | No | Image file, max 2MB |

**Success Response (201):**

```json
{
  "success": true,
  "message": "Food created successfully",
  "data": {
    "id": 50,
    "sub_category_id": 1,
    "name": {...},
    "description": {...},
    "size": "Large",
    "price": 12000,
    "image_path": "foods/shawarma.jpg",
    "is_available": true,
    "created_by": 1,
    "created_at": "2026-08-31T15:30:00.000000Z",
    "updated_at": "2026-08-31T15:30:00.000000Z",
    "sub_category": {...}
  }
}
```

---

### 4. Update Food

**POST** `/admin/foods/{id}` with `_method=PUT`

Updates an existing food item.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin/staff)

**Request Format:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| \_method | string | Yes | Must be "PUT" |
| sub_category_id | integer | No | Valid sub-category ID |
| name | object | No | Multilingual name |
| description | object | No | Multilingual description |
| size | string | No | Portion size, max 100 chars |
| price | integer | No | Price in smallest currency unit, min 0 |
| is_available | boolean | No | Availability status |
| image_path | file | No | New image file, max 2MB |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Food updated successfully",
  "data": {...}
}
```

---

### 5. Delete Food

**DELETE** `/admin/foods/{id}`

Deletes a food item. Only possible if no invoices reference it.

**Authentication:** Required (Bearer token)  
**Permission:** None (available to admin/staff)

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
    "success": true,
    "message": "Food deleted successfully",
    "data": null
}
```

**Error Response (409):**

```json
{
    "success": false,
    "message": "Cannot delete food with existing order history",
    "errors": null
}
```

---

## Admin: Tables

### 1. List All Tables

**GET** `/admin/tables`

Retrieves all restaurant tables.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Success Response (200):**

```json
{
    "success": true,
    "message": "Tables retrieved successfully",
    "data": [
        {
            "id": 1,
            "table_number": "T-01",
            "created_by": 1,
            "created_at": "2026-08-31T12:00:00.000000Z",
            "updated_at": "2026-08-31T12:00:00.000000Z"
        },
        {
            "id": 2,
            "table_number": "T-02",
            "created_by": 1,
            "created_at": "2026-08-31T12:00:00.000000Z",
            "updated_at": "2026-08-31T12:00:00.000000Z"
        }
    ]
}
```

---

### 2. Get Specific Table

**GET** `/admin/tables/{id}`

Retrieves a specific table.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
    "success": true,
    "message": "Table retrieved successfully",
    "data": {
        "id": 1,
        "table_number": "T-01",
        "created_by": 1,
        "created_at": "2026-08-31T12:00:00.000000Z",
        "updated_at": "2026-08-31T12:00:00.000000Z"
    }
}
```

**Error Response (404):**

```json
{
    "success": false,
    "message": "Table not found",
    "errors": null
}
```

---

### 3. Create Table

**POST** `/admin/tables`

Creates a new restaurant table.

**Authentication:** Required (Bearer token)  
**Permission:** `create_table`

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| table_number | string | Yes | Table identifier, max 50 chars, must be unique |

**Success Response (201):**

```json
{
    "success": true,
    "message": "Table created successfully",
    "data": {
        "id": 10,
        "table_number": "T-10",
        "created_by": 1,
        "created_at": "2026-08-31T15:30:00.000000Z",
        "updated_at": "2026-08-31T15:30:00.000000Z"
    }
}
```

**Error Response (422):**

```json
{
    "success": false,
    "message": "The table_number has already been taken.",
    "errors": {
        "table_number": ["The table_number has already been taken."]
    }
}
```

---

### 4. Update Table

**PUT** `/admin/tables/{id}`

Updates a table's number.

**Authentication:** Required (Bearer token)  
**Permission:** `update_table`

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| table_number | string | No | New table number, max 50 chars, must be unique |

**Success Response (200):**

```json
{
    "success": true,
    "message": "Table updated successfully",
    "data": {
        "id": 10,
        "table_number": "T-11",
        "created_by": 1,
        "created_at": "2026-08-31T15:30:00.000000Z",
        "updated_at": "2026-08-31T16:00:00.000000Z"
    }
}
```

---

### 5. Delete Table

**DELETE** `/admin/tables/{id}`

Deletes a table. Only possible if no reservations or invoices exist for it.

**Authentication:** Required (Bearer token)  
**Permission:** `delete_table`

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
    "success": true,
    "message": "Table deleted successfully",
    "data": null
}
```

**Error Response (409):**

```json
{
    "success": false,
    "message": "Cannot delete table with existing reservations or invoices",
    "errors": null
}
```

---

## Admin: Reservations

### 1. List All Reservations

**GET** `/admin/reservations`

Retrieves all reservations with table information.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Success Response (200):**

```json
{
    "success": true,
    "message": "Reservations retrieved successfully",
    "data": [
        {
            "id": 1,
            "table_id": 1,
            "name": "John Doe",
            "phone_number": "+9647701234567",
            "reservation_at": "2026-09-02T19:30:00.000000Z",
            "reservation_end": "2026-09-02T21:30:00.000000Z",
            "guest_count": 4,
            "status": "confirmed",
            "note": "Window seat preferred",
            "created_by": 1,
            "created_at": "2026-08-31T15:30:00.000000Z",
            "updated_at": "2026-08-31T15:30:00.000000Z",
            "table": {
                "id": 1,
                "table_number": "T-01",
                "created_by": 1,
                "created_at": "2026-08-31T12:00:00.000000Z",
                "updated_at": "2026-08-31T12:00:00.000000Z"
            }
        }
    ]
}
```

---

### 2. Get Specific Reservation

**GET** `/admin/reservations/{id}`

Retrieves a specific reservation with table details.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Reservation retrieved successfully",
  "data": {...}
}
```

**Error Response (404):**

```json
{
    "success": false,
    "message": "Reservation not found",
    "errors": null
}
```

---

### 3. Create Reservation

**POST** `/admin/reservations`

Creates a new reservation for a table.

**Authentication:** Required (Bearer token)  
**Permission:** `manage_reservations`

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| table_id | integer | Yes | Valid table ID |
| name | string | Yes | Guest name, max 255 chars |
| phone_number | string | Yes | Contact number, max 20 chars |
| reservation_at | string | Yes | Start time (ISO 8601 datetime), must be >= now |
| reservation_end | string | Yes | End time (ISO 8601 datetime), must be > reservation_at |
| guest_count | integer | Yes | Number of guests, 1-50 |
| status | string | No | pending, confirmed, cancelled, or completed (defaults to 'pending') |
| note | string | No | Additional notes |

**Important Business Logic:**

- System checks for overlapping reservations on the same table
- If a time conflict exists with another non-cancelled reservation, returns 409 conflict
- Overlapping check: `(new_start < existing_end) AND (new_end > existing_start)`

**Success Response (201):**

```json
{
  "success": true,
  "message": "Reservation created successfully",
  "data": {
    "id": 10,
    "table_id": 1,
    "name": "Ahmed Hassan",
    "phone_number": "+9647701234567",
    "reservation_at": "2026-09-02T19:30:00.000000Z",
    "reservation_end": "2026-09-02T21:30:00.000000Z",
    "guest_count": 4,
    "status": "pending",
    "note": "Please prepare a quiet corner table",
    "created_by": 1,
    "created_at": "2026-08-31T15:45:00.000000Z",
    "updated_at": "2026-08-31T15:45:00.000000Z",
    "table": {...}
  }
}
```

**Error Response (409 - Conflict):**

```json
{
    "success": false,
    "message": "This table is already reserved during the selected time",
    "errors": null
}
```

---

### 4. Update Reservation

**PUT** `/admin/reservations/{id}`

Updates a reservation.

**Authentication:** Required (Bearer token)  
**Permission:** `manage_reservations`

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| table_id | integer | No | Valid table ID |
| name | string | No | Guest name, max 255 chars |
| phone_number | string | No | Contact number, max 20 chars |
| reservation_at | string | No | Start time, must be >= now |
| reservation_end | string | No | End time, must be > reservation_at |
| guest_count | integer | No | Number of guests, 1-50 |
| status | string | No | pending, confirmed, cancelled, or completed |
| note | string | No | Additional notes |

**Important Business Logic:**

- If `reservation_at` or `reservation_end` is changed, overlap check is re-run
- Overlap check excludes the current reservation's own ID
- Returns 409 if conflict detected after date change

**Success Response (200):**

```json
{
  "success": true,
  "message": "Reservation updated successfully",
  "data": {...}
}
```

---

### 5. Delete Reservation

**DELETE** `/admin/reservations/{id}`

Deletes a reservation.

**Authentication:** Required (Bearer token)  
**Permission:** `manage_reservations`

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
    "success": true,
    "message": "Reservation deleted successfully",
    "data": null
}
```

---

## Admin: Invoices

### 1. List All Invoices

**GET** `/admin/invoices`

Retrieves all invoices with table and food item details.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Success Response (200):**

```json
{
  "success": true,
  "message": "Invoices retrieved successfully",
  "data": [
    {
      "id": 1,
      "table_id": 1,
      "created_by": 1,
      "status": "completed",
      "discount": 0,
      "total": 27000,
      "created_at": "2026-08-31T12:00:00.000000Z",
      "updated_at": "2026-08-31T12:00:00.000000Z",
      "table": {
        "id": 1,
        "table_number": "T-01",
        "created_by": 1,
        "created_at": "2026-08-31T12:00:00.000000Z",
        "updated_at": "2026-08-31T12:00:00.000000Z"
      },
      "invoice_foods": [
        {
          "id": 1,
          "invoice_id": 1,
          "food_id": 1,
          "person_number": 1,
          "quantity": 2,
          "unit_price": 10000,
          "status": "pending",
          "note": null,
          "created_at": "2026-08-31T12:00:00.000000Z",
          "updated_at": "2026-08-31T12:00:00.000000Z",
          "food": {
            "id": 1,
            "sub_category_id": 1,
            "name": {...},
            "price": 10000,
            "is_available": true
          }
        }
      ]
    }
  ]
}
```

---

### 2. Get Specific Invoice

**GET** `/admin/invoices/{id}`

Retrieves a specific invoice with all details.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Invoice retrieved successfully",
  "data": {...}
}
```

**Error Response (404):**

```json
{
    "success": false,
    "message": "Invoice not found",
    "errors": null
}
```

---

### 3. Create Invoice with Items

**POST** `/admin/invoices`

Creates a new invoice for a table with all food items in a single request.

**Authentication:** Required (Bearer token)  
**Permission:** `create_invoice`

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| table_id | integer | Yes | Valid table ID, must not have existing pending invoice |
| discount | integer | No | Discount amount, min 0 (defaults to 0) |
| items | array | No | Array of food items to add to invoice |
| items[].food_id | integer | Yes | Valid food ID |
| items[].person_number | integer | Yes | Person number (1-8) |
| items[].quantity | integer | Yes | Quantity ordered, min 1 |
| items[].note | string | No | Special instructions for this item |

**Important Business Logic:**

- Only ONE pending invoice allowed per table at a time
- If a pending invoice exists for that table, returns 409 conflict
- `unit_price` is automatically captured from `food.price` at creation time (do NOT send it)
- Invoice `status` defaults to 'pending'
- Invoice `total` is automatically calculated via Observer: `SUM(unit_price × quantity)` for non-cancelled items, minus discount
- All creation happens in a single DB transaction with row locking to prevent race conditions
- Creates fail if any food item is unavailable (`is_available = false`)

**Success Response (201):**

```json
{
  "success": true,
  "message": "Invoice created successfully",
  "data": {
    "id": 10,
    "table_id": 1,
    "created_by": 1,
    "status": "pending",
    "discount": 0,
    "total": 37000,
    "created_at": "2026-08-31T16:00:00.000000Z",
    "updated_at": "2026-08-31T16:00:00.000000Z",
    "table": {...},
    "invoice_foods": [
      {
        "id": 20,
        "invoice_id": 10,
        "food_id": 1,
        "person_number": 1,
        "quantity": 2,
        "unit_price": 10000,
        "status": "pending",
        "note": "Extra spicy",
        "created_at": "2026-08-31T16:00:00.000000Z",
        "updated_at": "2026-08-31T16:00:00.000000Z",
        "food": {...}
      },
      {
        "id": 21,
        "invoice_id": 10,
        "food_id": 3,
        "person_number": 2,
        "quantity": 1,
        "unit_price": 17000,
        "status": "pending",
        "note": null,
        "created_at": "2026-08-31T16:00:00.000000Z",
        "updated_at": "2026-08-31T16:00:00.000000Z",
        "food": {...}
      }
    ]
  }
}
```

**Error Response (409 - Duplicate Pending Invoice):**

```json
{
    "success": false,
    "message": "An active invoice already exists for this table",
    "errors": null
}
```

**Example Request:**

```json
{
    "table_id": 1,
    "discount": 0,
    "items": [
        {
            "food_id": 1,
            "person_number": 1,
            "quantity": 2,
            "note": "Extra spicy"
        },
        {
            "food_id": 3,
            "person_number": 2,
            "quantity": 1,
            "note": null
        }
    ]
}
```

---

### 4. Update Invoice

**PUT** `/admin/invoices/{id}`

Updates invoice status or discount.

**Authentication:** Required (Bearer token)  
**Permission:** `update_invoice`

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| status | string | No | pending, completed, or cancelled |
| discount | integer | No | Discount amount, min 0 |

**Important Business Logic:**

- When discount changes, the invoice total is automatically recalculated
- Recalculation formula: `SUM(unit_price × quantity)` for non-cancelled items, minus new discount
- Observer handles recalculation automatically

**Success Response (200):**

```json
{
  "success": true,
  "message": "Invoice updated successfully",
  "data": {
    "id": 10,
    "table_id": 1,
    "created_by": 1,
    "status": "completed",
    "discount": 5000,
    "total": 32000,
    "created_at": "2026-08-31T16:00:00.000000Z",
    "updated_at": "2026-08-31T16:30:00.000000Z",
    "table": {...},
    "invoice_foods": [...]
  }
}
```

---

### 5. Delete Invoice

**DELETE** `/admin/invoices/{id}`

Deletes an invoice. Only possible if no items exist (foreign key restriction).

**Authentication:** Required (Bearer token)  
**Permission:** `cancel_invoice`

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | integer | Yes |

**Success Response (200):**

```json
{
    "success": true,
    "message": "Invoice deleted successfully",
    "data": null
}
```

**Error Response (409):**

```json
{
    "success": false,
    "message": "Cannot delete invoice with existing items",
    "errors": null
}
```

---

## Admin: Invoice Food Items

### 1. List Invoice Items

**GET** `/admin/invoices/{invoice}/food`

Retrieves all food items in a specific invoice with food details.

**Authentication:** Required (Bearer token)  
**Permission:** None

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| invoice | integer | Yes | Invoice ID |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Invoice items retrieved successfully",
  "data": [
    {
      "id": 20,
      "invoice_id": 10,
      "food_id": 1,
      "person_number": 1,
      "quantity": 2,
      "unit_price": 10000,
      "status": "pending",
      "note": "Extra spicy",
      "created_at": "2026-08-31T16:00:00.000000Z",
      "updated_at": "2026-08-31T16:00:00.000000Z",
      "food": {
        "id": 1,
        "sub_category_id": 1,
        "name": {
          "en": "Shawarma",
          "ar": "شاورما",
          "ku": "شاورما"
        },
        "description": {...},
        "size": "Large",
        "price": 10000,
        "image_path": "foods/shawarma.jpg",
        "is_available": true,
        "created_by": 1,
        "created_at": "2026-08-31T12:00:00.000000Z",
        "updated_at": "2026-08-31T12:00:00.000000Z"
      }
    }
  ]
}
```

**Error Response (404):**

```json
{
    "success": false,
    "message": "Invoice not found",
    "errors": null
}
```

---

### 2. Update Invoice Item Quantity / Note

**PUT** `/admin/invoices/{invoice}/food/{foodItem}`

Updates an existing invoice food item's quantity and/or note.

**Authentication:** Required (Bearer token)  
**Permission:** `update_invoice_item`

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| invoice | integer | Yes | Invoice ID |
| foodItem | integer | Yes | Invoice food item ID |

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| quantity | integer | No | Exact new quantity, min 1 |
| note | string | No | Special instructions |

**Important Business Logic:**

- `unit_price` is IMMUTABLE - it was captured at creation time and cannot be changed
- Changing quantity triggers automatic invoice total recalculation via Observer
- This is the endpoint used by the waiter to adjust item quantity in the order window
- Total formula: `SUM(unit_price × quantity)` for items where `status != 'cancelled'`, minus discount

**Success Response (200):**

```json
{
  "success": true,
  "message": "Invoice item updated successfully",
  "data": {
    "id": 20,
    "invoice_id": 10,
    "food_id": 1,
    "person_number": 1,
    "quantity": 5,
    "unit_price": 10000,
    "status": "pending",
    "note": "Updated note",
    "created_at": "2026-08-31T16:00:00.000000Z",
    "updated_at": "2026-08-31T16:15:00.000000Z",
    "food": {...}
  }
}
```

**Error Response (404):**

```json
{
    "success": false,
    "message": "Invoice item not found",
    "errors": null
}
```

---

### 3. Delta Quantity Adjustment (Plus / Minus)

**PATCH** `/admin/invoices/{invoice}/food/{foodItem}/quantity`

Adjusts quantity by a signed delta value. This is the backend endpoint for a plus/minus button in the waiter order UI.

**Authentication:** Required (Bearer token)  
**Permission:** `update_invoice_item`

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| invoice | integer | Yes | Invoice ID |
| foodItem | integer | Yes | Invoice food item ID |

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| delta | integer | Yes | +1 for increase, -1 for decrease |

**Important Business Logic:**

- Quantity cannot go below 1
- This is the dedicated action for plus/minus button behavior
- The invoice total is recalculated automatically after the update

**Success Response (200):**

```json
{
  "success": true,
  "message": "Invoice item quantity updated successfully",
  "data": {
    "id": 20,
    "invoice_id": 10,
    "food_id": 1,
    "person_number": 1,
    "quantity": 8,
    "unit_price": 10000,
    "status": "pending",
    "note": null,
    "created_at": "2026-08-31T16:00:00.000000Z",
    "updated_at": "2026-08-31T16:15:00.000000Z",
    "food": {...}
  }
}
```

**Error Response (422):**

```json
{
    "success": false,
    "message": "Quantity cannot be less than 1.",
    "errors": null
}
```

---

### 4. Change Food Status

**PATCH** `/admin/invoices/{invoice}/food/{foodItem}/status`

Updates the kitchen preparation status of an invoice food item.

**Authentication:** Required (Bearer token)  
**Permission:** `update_invoice_food_status`

**Important Business Logic:**

- This action is reserved for the chef role
- Waiters do not have this permission and receive `403 Forbidden`
- Allowed statuses: `pending`, `preparing`, `ready`, `served`, `cancelled`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Invoice item status updated successfully",
  "data": {...}
}
```

**Error Response (403):**

```json
{
    "success": false,
    "message": "You do not have permission to update food status.",
    "errors": null
}
```

---

### 5. Cancel Invoice Item

**DELETE** `/admin/invoices/{invoice}/food/{foodItem}`

Cancels (soft deletes) a food item from an invoice.

**Authentication:** Required (Bearer token)  
**Permission:** `update_invoice_item`

**Path Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| invoice | integer | Yes | Invoice ID |
| foodItem | integer | Yes | Invoice food item ID |

**Important Business Logic:**

- This is a SOFT delete - sets `status = 'cancelled'` instead of hard deleting
- Row remains in database (preserves audit trail)
- Cancelled items are excluded from invoice total calculation
- Observer automatically recalculates invoice total after cancellation
- Cannot hard delete due to foreign key constraints

**Success Response (200):**

```json
{
    "success": true,
    "message": "Invoice item cancelled successfully",
    "data": null
}
```

**After cancellation, the invoice total is automatically recalculated:**

- Example: If item was 5 × 10000 = 50000, total decreases by 50000
- If this was the only non-cancelled item, invoice total becomes 0 (minus any discount)

**Error Response (404):**

```json
{
    "success": false,
    "message": "Invoice item not found",
    "errors": null
}
```

---

## Response Codes Reference

| Code | Meaning              | Typical When                                                                      |
| ---- | -------------------- | --------------------------------------------------------------------------------- |
| 200  | OK                   | Successful GET, PUT, DELETE                                                       |
| 201  | Created              | Successful POST creating new resource                                             |
| 400  | Bad Request          | Malformed request syntax                                                          |
| 401  | Unauthorized         | Missing or invalid authentication token                                           |
| 403  | Forbidden            | Authenticated but lacks required permission                                       |
| 404  | Not Found            | Resource ID does not exist                                                        |
| 409  | Conflict             | Business logic conflict (duplicate invoice, time overlap, foreign key constraint) |
| 422  | Unprocessable Entity | Validation error in request fields                                                |
| 500  | Server Error         | Unexpected server error                                                           |

---

## Best Practices

1. **Always include Authorization header** for protected routes
2. **File uploads:** Use `multipart/form-data` encoding, not JSON
3. **File uploads via PUT:** Use POST with `_method=PUT` field due to browser/HTTP limitations
4. **Datetime format:** Use ISO 8601 format (e.g., `2026-09-02T19:30:00Z`)
5. **Multilingual fields:** Always provide all three languages (en, ar, ku) when required
6. **Price amounts:** Stored in smallest currency unit (e.g., cents for USD)
7. **Invoices:** Create with items in single POST request, don't add items separately
8. **Reservations:** Check response for 409 conflict if time slot is taken
9. **Invoice items:** Cannot be deleted, only cancelled (soft delete) via status change
10. **Permissions:** Check available permissions via `GET /admin/roles-permissions` before assigning

---

_Last Updated: 2026-08-31_  
_API Version: 1.0_

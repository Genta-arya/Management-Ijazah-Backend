const express = require("express");
const db = require("./koneksi"); // Pastikan Anda memiliki modul koneksi database yang sesuai
const bodyParser = require("body-parser");
const app = express();
const port = 3001;
const cors = require("cors");
const API = "192.168.1.20";
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const secretKey = "test";
const fs = require('fs');
let globalToken = null;

app.use(cors());
app.use(bodyParser.json());


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "asset"));
  },
  filename: function (req, file, cb) {
    const originalname = file.originalname; 
    const currentDate = new Date().toISOString().slice(0, 10); 

    // Generate random 5-digit number
    const randomDigits = Math.floor(10000 + Math.random() * 90000);

    const newFilename = `SMK2-IJASAH-${currentDate}-${randomDigits}-${originalname}`;
    cb(null, newFilename);
  },
});
const upload = multer({ storage: storage });





function generateSiswaID() {
  const randomID = Math.random().toString(36).substring(2, 12);
  return `siswa-${randomID}`;
}
function checkNISNExist(nisn, callback) {
  db.query("SELECT * FROM siswa WHERE nisn = ?", [nisn], (err, result) => {
    if (err) {
      console.error(err);
      callback(err, false);
    } else {
      callback(null, result.length > 0);
    }
  });
}
app.put('/auth/update-profile-image/:id', upload.single('profileImage'), (req, res) => {
  try {
    const postId = req.params.id;
    const gambar = req.file ? req.file.filename : null;

    // Ambil data posting dari database untuk mendapatkan nama gambar sebelumnya
    const selectQuery = "SELECT image FROM auth WHERE uid=?";
    db.query(selectQuery, [postId], (error, results) => {
      if (error) {
        console.error("Error query:", error);
        res.status(500).send("Error server");
      } else {
        const oldImage = results.length > 0 ? results[0].image : null;

        // Perbarui data posting beserta nama file gambar (jika ada) di database
        const updateQuery = "UPDATE auth SET image=? WHERE uid=?";
        db.query(updateQuery, [gambar, postId], (error, results) => {
          if (error) {
            console.error("Error query:", error);
            res.status(500).send("Error server");
          } else {
            // Kirim hasil query sebagai respon
            res.status(200).json(results);
            console.log("berhasil");

            // Hapus gambar sebelumnya dari server jika ada
            if (oldImage) {
              const filePath = path.join(__dirname, "asset", oldImage);
              fs.unlink(filePath, (err) => {
                if (err) {
                  console.error("Error menghapus gambar lama:", err);
                } else {
                  console.log("Gambar lama berhasil dihapus");
                }
              });
            }
          }
        });
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error server");
  }
});

app.post("/upload", upload.single("pdfFile"), (req, res) => {
  const uploadedFile = req.file;
  const { namaSiswa, nisn } = req.body;

  if (!namaSiswa || !nisn) {
    return res.status(400).json({ message: "Nama siswa dan NISN harus diisi" });
  }

  const idSiswa = generateSiswaID();
  checkNISNExist(nisn, (err, isExist) => {
    if (err) {
      return res.status(500).json({ message: "Error checking NISN" });
    }

    if (isExist) {
      return res.status(400).json({ message: "NISN already exists" });
    }

    if (!uploadedFile) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    db.query(
      "INSERT INTO siswa (id_siswa, nama_siswa, nisn) VALUES (?, ?, ?)",
      [idSiswa, namaSiswa, nisn],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Error saving student information" });
        }
        db.query(
          "INSERT INTO dokumen (nisn, ijasah) VALUES (?, ?)",
          [nisn, uploadedFile.filename],
          (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "Error saving document information" });
            }
            res.status(200).json({ message: "File and student information uploaded successfully" });
          }
        );
      }
    );
  });
});

app.post("/cek-nisn", (req, res) => {
  const { nisn } = req.body;

  if (!nisn) {
    return res.status(400).json({ message: "NISN harus diisi" });
  }

  // Lakukan pemeriksaan NISN di database
  db.query("SELECT * FROM siswa WHERE nisn = ?", [nisn], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error checking NISN" });
    }

    if (result.length > 0) {
      return res.status(200).json({ isExist: true, message: "NISN sudah terdaftar" });
    } else {
      return res.status(200).json({ isExist: false, message: "NISN belum terdaftar" });
    }
  });
});


//handle login

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  const query = "SELECT * FROM auth WHERE username = ?";
  const queryParams = [username];

  db.query(query, queryParams, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (result.length === 0) {
      return res.status(401).json({ message: "Username atau Password salah" });
    }

    const user = result[0];

    bcrypt.compare(password, user.password, (bcryptErr, bcryptResult) => {
      if (bcryptErr) {
        console.error(bcryptErr);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (!bcryptResult) {
        return res.status(401).json({ message: "Authentication failed" });
      }

      const tokenLogin = jwt.sign({ username: user.username }, secretKey);
     

      const updateTokenQuery = "UPDATE auth SET jwt_token = ? WHERE uid = ?";
      const updateTokenParams = [tokenLogin, user.uid];

      db.query(updateTokenQuery, updateTokenParams, (updateErr, updateResult) => {
        if (updateErr) {
          console.error(updateErr);
          return res.status(500).json({ message: "Internal server error" });
        }
        res.status(200).json({ message: "Login successful", token: tokenLogin , uid: user.uid });
        setTimeout(() => {
          const clearTokenQuery = "UPDATE auth SET jwt_token = NULL WHERE uid = ?";
          const clearTokenParams = [user.uid];

          db.query(clearTokenQuery, clearTokenParams, (clearErr, clearResult) => {
            if (clearErr) {
              console.error(clearErr);
            }
            console.log("Token cleared after 10 seconds");
          });
        }, 21600000); 
      });
    });
  });
});


app.get("/auth", (req, res) => {
  const query = "SELECT * FROM auth";

  db.query(query, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(result);
  });
});

app.get("/auth/:uid/image", (req, res) => {
  const uid = req.params.uid;

  const query = "SELECT image FROM auth WHERE uid = ?";
  
  db.query(query, [uid], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (result.length === 0 || !result[0].image) {
      return res.status(404).json({ message: "Image not found" });
    }

    const imagePath = result[0].image;
    const fullImagePath = path.join(__dirname, "asset", imagePath);

    // Baca file gambar dan kirimkan sebagai respons
    res.sendFile(fullImagePath);
  });
});



app.put('/auth/update-password/:id', async (req, res) => {
  const id = req.params.id;
  const { currentPassword, newPassword } = req.body;

  try {
   
    const getPasswordQuery = 'SELECT password FROM auth WHERE uid = ?';
    db.query(getPasswordQuery, [id], async (err, getPasswordResult) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (getPasswordResult.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const storedHashedPassword = getPasswordResult[0].password;
      const isPasswordValid = await bcrypt.compare(currentPassword, storedHashedPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Password Tidak Sesuai' });
      }

      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      const updatePasswordQuery = 'UPDATE auth SET password = ? WHERE uid = ?';
      db.query(updatePasswordQuery, [hashedNewPassword, id], (err, updatePasswordResult) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        res.status(200).json({ message: 'Password Berhasil Diganti' });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.put('/auth/update-profile-name/:id', (req, res) => {
  const id = req.params.id;
  const newName = req.body.newName;

  if (!newName) {
    return res.status(400).json({ message: 'New name is required' });
  }

  try {
    const updateProfileNameQuery = 'UPDATE auth SET name = ? WHERE uid = ?';
    db.query(updateProfileNameQuery, [newName, id], (error, result) => {
      if (error) {
        console.error('Error updating profile name:', error);
        res.status(500).json({ message: 'Internal server error' });
      } else {
        res.status(200).json({ message: 'Profile name updated successfully' });
      }
    });
  } catch (error) {
    console.error('Error updating profile name:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

















function authenticateToken(req, res, next) {
  const tokenFromHeader = req.headers['authorization'];

  if (!tokenFromHeader) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = tokenFromHeader.replace("Bearer ", "");

  const getUserIdQuery = "SELECT * FROM auth WHERE jwt_token = ?";
  const getUserIdParams = [token];

  db.query(getUserIdQuery, getUserIdParams, (getUserErr, getUserResult) => {
    if (getUserErr) {
      console.error(getUserErr);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (getUserResult.length === 0) {
      return res.status(403).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  });
}

//get document wajib login

app.get("/documents", authenticateToken, (req, res) => {
  const idSiswa = req.query.id_siswa;

  if (idSiswa) {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;

    const queryCount =
      "SELECT COUNT(*) as total FROM dokumen JOIN siswa ON dokumen.nisn = siswa.nisn WHERE dokumen.nisn = ?";
    const countParams = [idSiswa];

    db.query(queryCount, countParams, (countErr, countResult) => {
      if (countErr) {
        console.error(countErr);
        return res.status(500).json({ message: "Internal server error" });
      }

      const totalItems = countResult[0].total;

      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;

      const query =
  "SELECT d.*, s.nama_siswa FROM dokumen d JOIN siswa s ON d.nisn = s.nisn WHERE d.nisn = ? LIMIT ?, ?";
const queryParams = [idSiswa, startIndex, itemsPerPage];

    

      db.query(query, queryParams, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Internal server error" });
        }

        const responseData = {
          currentPage: page,
          itemsPerPage: itemsPerPage,
          totalItems: totalItems,
          totalPages: totalPages,
          data: result,
        };

        res.status(200).json(responseData);
      });
    });
  } else {
    const query =
    "SELECT d.*, s.nama_siswa FROM dokumen d LEFT JOIN siswa s ON d.nisn = s.nisn";
  

    db.query(query, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
      }
      const responseData = {
        data: result,
      };
      res.status(200).json(responseData);
    });
  }
});


app.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, 'asset', filename);

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  // Set appropriate headers for the response
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/octet-stream');

  // Create a read stream from the file and pipe it to the response
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});


app.delete("/delete/:nisn", (req, res) => {
  const nisn = req.params.nisn;

  if (!nisn) {
    return res.status(400).json({ message: "NISN harus disediakan" });
  }

  // Periksa apakah NISN ada dalam database sebelum penghapusan
  checkNISNExist(nisn, (err, isExist) => {
    if (err) {
      return res.status(500).json({ message: "Error checking NISN" });
    }

    if (!isExist) {
      return res.status(404).json({ message: "NISN tidak ditemukan" });
    }

    // Ambil nama file dokumen dari database
    db.query("SELECT ijasah FROM dokumen WHERE nisn = ?", [nisn], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error fetching document information" });
      }

      if (result.length === 0) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan" });
      }

      const fileName = result[0].ijasah;

      // Hapus file dari server
      const filePath = path.join(__dirname, "asset", fileName);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error(unlinkErr);
          return res.status(500).json({ message: "Error deleting document file" });
        }

        // Setelah menghapus file, lanjutkan penghapusan data siswa dan dokumen
        db.query("DELETE FROM dokumen WHERE nisn = ?", [nisn], (deleteErr, deleteResult) => {
          if (deleteErr) {
            console.error(deleteErr);
            return res.status(500).json({ message: "Error deleting document information" });
          }

          db.query("DELETE FROM siswa WHERE nisn = ?", [nisn], (deleteErr, deleteResult) => {
            if (deleteErr) {
              console.error(deleteErr);
              return res.status(500).json({ message: "Error deleting student information" });
            }

            res.status(200).json({ message: "Data siswa, dokumen, dan file berhasil dihapus" });
          });
        });
      });
    });
  });
});



app.put("/documents/edit/:id_dokumen", authenticateToken, upload.single('pdfFile'), (req, res) => {
  const idDokumen = req.params.id_dokumen;
  const { nisn } = req.body;
  const uploadedFile = req.file;

  if (!idDokumen) {
    return res.status(400).json({ message: "ID dokumen harus disediakan" });
  }

  const updateData = {}; // Object untuk menyimpan atribut yang akan diupdate

  if (nisn) {
    updateData.nisn = nisn;
  }

  // Handle the uploaded PDF file
  if (uploadedFile) {
    updateData.ijasah = uploadedFile.filename;
  }

  let newNisn = null;
  let oldNisn = null;

  db.query(
    "SELECT nisn FROM dokumen WHERE id_dokumen = ?",
    [idDokumen],
    (selectErr, selectResult) => {
      if (selectErr) {
        console.error(selectErr);
        return res.status(500).json({ message: "Error selecting nisn from dokumen" });
      }

      oldNisn = selectResult[0].nisn;

      db.query(
        "UPDATE dokumen SET ? WHERE id_dokumen = ?",
        [updateData, idDokumen],
        (updateErr, updateResult) => {
          if (updateErr) {
            console.error(updateErr);
            return res.status(500).json({ message: "Error updating document information" });
          }

          if (nisn) {
            newNisn = nisn;
          }

          if (newNisn && oldNisn) {
            const studentUpdateData = {
              nisn: newNisn,
            };

            db.query(
              "UPDATE siswa SET ? WHERE nisn = ?",
              [studentUpdateData, oldNisn],
              (studentUpdateErr, studentUpdateResult) => {
                if (studentUpdateErr) {
                  console.error(studentUpdateErr);
                  return res.status(500).json({ message: "Error updating student information" });
                }

                res.status(200).json({ message: "Data dokumen dan siswa berhasil diupdate" });
              }
            );
          } else {
            res.status(200).json({ message: "Data dokumen berhasil diupdate" });
          }
        }
      );
    }
  );
});

app.post('/edit', upload.single('pdfFile'), (req, res) => {
  const uploadedFile = req.file;
  const { nisn } = req.body;

  if (!uploadedFile) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const ijasahFileName = uploadedFile.filename;

  db.query(
    'UPDATE dokumen SET ijasah = ? WHERE nisn = ?',
    [ijasahFileName, nisn],
    (err, result) => {
      if (err) {
        console.error('Error updating document information:', err);
        return res.status(500).json({ message: 'Error updating document information' });
      }

      res.status(200).json({ message: 'File uploaded successfully' });
    }
  );
});




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

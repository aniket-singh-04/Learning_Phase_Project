import { ObjectId } from 'mongodb';

export default async function checkAuth(req, res, next) {
  const { uid } = req.cookies;
  const db = req.db
  if(!uid){
    return res.status(401).json({error: "Not Uid Present"})
  }
  const user = await db.collection("users").findOne({_id: new ObjectId(String(uid))});
  if (!uid || !user) {
    return res.status(401).json({ error: "Not logged!" });
  }
  req.user = user
  next()
}

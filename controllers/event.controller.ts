import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";

import { EventService, MailService, NotificationService } from "../services";
import ApiError from "../utils/ApiError";

export const get = catchAsync(async (req: Request, res: Response) => {
  const data = await EventService.query(
    req.query.search || req.query.date || req.query.end_date
      ? {
          $and: [
            req.query.search && String(req.query.search).length > 0
              ? {
                  $or: [
                    { title: { $regex: req.query.search, $options: "i" } },
                    {
                      keywords: {
                        $in: new RegExp("^[" + req.query.search + "].*", "i"),
                      },
                    },
                    { venue: { $regex: req.query.search, $options: "i" } },
                  ],
                }
              : {},
            { status: 3 },
            req.query.date
              ? { date: { $gte: new Date(String(req.query.date)) } }
              : {},
            req.query.end_date
              ? { date: { $lte: new Date(String(req.query.end_date)) } }
              : {},
          ],
        }
      : { ...req.query },
    {
      ...req.query,
      populate: "created_by,category_id,approved_by",
      sortBy: "-updatedAt",
    }
  );
  return res.json(data);
});

export const create = catchAsync(async (req: Request, res: Response) => {
  const user: any = req.user;
  const data = await EventService.create({
    ...req.body,

    created_by: user.id,
    updated_by: user.role,
    slug:
      req.body?.title?.toLowerCase()?.split(" ").join("-") +
      "-" +
      user.username,
    ...(user.role === "agent" ? { status: 2 } : {}),
  });

  return res.json(data);
});

export const deleteDocument = catchAsync(
  async (req: Request, res: Response) => {
    const data = await EventService.deleteDocument(req.params.id);
    return res.json(data);
  }
);

export const update = catchAsync(async (req: Request, res: Response) => {
  const user: any = req.user;
  const blog = await EventService.getById(req.params.id);
  if (req.body.status) {
    if (blog.status !== 2) {
      throw new ApiError(403, "You cannot publish this event");
    }
  }
  const data = await EventService.update(req.params.id, {
    ...req.body,
    slug:
      req.body?.title?.toLowerCase()?.split(" ").join("-") +
      "-" +
      user.username,
    updated_by: user.role,
    ...(user.role === "user"
      ? { status: req.body.status ? req.body.status : 0 }
      : {}),
  });
  if (user.role === "agent" && data.status !== 1) {
    const created_by: any = data.created_by;
    await NotificationService.create(
      created_by.id,
      "Event Update",
      "Your Event has been updated by an agent please check your email for further information "
    );
    await MailService.sendBlogAgentUpdate(
      created_by.email,
      user.name,
      "/events/" + data.slug,
      "event"
    );
  }

  return res.json(data);
});

export const getSingle = catchAsync(async (req: Request, res: Response) => {
  const data = await EventService.getById(req.params.id);

  return res.json(data);
});

export const agentUpdate = catchAsync(async (req: Request, res: Response) => {
  const user: any = req.user;
  const data = await EventService.agentUpdate(req.params.id, {
    approved_by: user.id,
    ...req.body,
    updated_by: user.role,
  });
  if (req.body.status === 1) {
    const created_by: any = data.created_by;
    await MailService.sendBlogReject(
      created_by.email,
      user.name,
      req.body.reject_reason,
      data.title,
      "event"
    );
    await NotificationService.create(
      created_by.id,
      "Event Update",
      "Your event has been rejected please check your email for further information "
    );
  }
  if (req.body.status === 2) {
    const created_by: any = data.created_by;
    await MailService.sendBlogAccept(
      created_by.email,
      user.name,
      "/events/" + data.slug,
      "event"
    );
    await NotificationService.create(
      created_by.id,
      "Event Update",
      "Your event has been approved please check your email for further information "
    );
  }
  return res.json(data);
});

export const comment = catchAsync(async (req: Request, res: Response) => {
  const user: any = req.user;
  const data = await EventService.comment(req.params.id, {
    ...req.body,
    user_id: user.id,
  });
  res.json(data);
});

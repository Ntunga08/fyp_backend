import type { Request, Response } from 'express'
import * as ReportService from '../services/report.service.js'

// GET /api/reports/daily?date=2025-05-10 

export const daily = async (req: Request, res: Response): Promise<void> => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0]

    const report = await ReportService.generateDailyReport(date)

    res.status(200).json({
      success: true,
      data:    report,
    })
  } catch (error: any) {
    const status = error.message.includes('weekend') ? 400 : 500
    res.status(status).json({ success: false, message: error.message })
  }
}

// GET /api/reports/weekly?startDate=2025-05-05&endDate=2025-05-09 

export const weekly = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      })
      return
    }

    const report = await ReportService.generatePeriodReport(
      { startDate: startDate as string, endDate: endDate as string },
      'Weekly'
    )

    res.status(200).json({ success: true, data: report })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/reports/monthly?startDate=2025-05-01&endDate=2025-05-31 

export const monthly = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      })
      return
    }

    const report = await ReportService.generatePeriodReport(
      { startDate: startDate as string, endDate: endDate as string },
      'Monthly'
    )

    res.status(200).json({ success: true, data: report })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/reports/teacher?teacherId=1&startDate=&endDate= 

export const teacherPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, startDate, endDate } = req.query

    if (!teacherId || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'teacherId, startDate and endDate are required',
      })
      return
    }

    const report = await ReportService.generateTeacherReport({
      teacherId: Number(teacherId),
      startDate: startDate as string,
      endDate:   endDate   as string,
    })

    res.status(200).json({ success: true, data: report })
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500
    res.status(status).json({ success: false, message: error.message })
  }
}

//  GET /api/reports/inconsistencies?date=2025-05-10 

export const inconsistencies = async (req: Request, res: Response): Promise<void> => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0]

    const report = await ReportService.generateInconsistencyReport(date)

    res.status(200).json({
      success: true,
      message: report.totalFlags === 0
        ? 'No inconsistencies found for this date'
        : `${report.totalFlags} inconsistency flag(s) detected`,
      data: report,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/reports/my?startDate=&endDate= 
// Teacher: own performance report

export const myReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId            = req.user!.userId
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      })
      return
    }

    const report = await ReportService.generateTeacherReport({
      teacherId,
      startDate: startDate as string,
      endDate:   endDate   as string,
    })

    res.status(200).json({ success: true, data: report })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}